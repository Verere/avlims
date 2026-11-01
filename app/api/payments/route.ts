import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import Payment, { IPayment } from '../../../models/Payment';
import Bill from '@/models/Bill';
import ReferralLedger from '../../../models/ReferralLedger';
import { dbConnect } from '../../../lib/mongodb';
import { writeAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get("branchId");
    const isCancelled = req.nextUrl.searchParams.get("isCancelled");
    const query: Record<string, any> = {};
    if (branchId) {
      query.branchId = branchId;
    }
    if (isCancelled === "true" || isCancelled === "false") {
      query.isCancelled = isCancelled === "true";
    }
    const payments = await Payment.find(query).sort({ createdAt: -1 });
    const orderIds = payments.reduce<mongoose.Types.ObjectId[]>((ids, payment) => {
      if (payment.orderId) ids.push(payment.orderId);
      return ids;
    }, []);
    const billedOrderIds = orderIds.length
      ? await Bill.find({ orderId: { $in: orderIds } }).distinct('orderId')
      : [];
    const billedOrders = new Set(billedOrderIds.map(String));
    const standalonePayments = payments.filter((payment) => !payment.orderId || !billedOrders.has(String(payment.orderId)));
    return NextResponse.json(standalonePayments, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const { paymentId, branchId, entryIndex, method } = body || {};
    const normalizedMethod = String(method || "").trim().toLowerCase();
    const allowedMethods = ["cash", "pos", "transfer", "other"];

    if (!mongoose.isValidObjectId(paymentId) || !mongoose.isValidObjectId(branchId)) {
      return NextResponse.json({ error: "Invalid payment or branch ID" }, { status: 400 });
    }
    if (!Number.isInteger(entryIndex) || entryIndex < 0) {
      return NextResponse.json({ error: "Invalid payment entry index" }, { status: 400 });
    }
    if (!allowedMethods.includes(normalizedMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const payment = await Payment.findOne({ _id: paymentId, branchId });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    const entries = payment.payments as Array<{ method: string; amount: number }>;
    if (!Array.isArray(entries) || !entries[entryIndex]) {
      return NextResponse.json({ error: "Payment entry not found" }, { status: 404 });
    }

    const previousMethod = entries[entryIndex].method;
    entries[entryIndex].method = normalizedMethod;
    payment.markModified("payments");
    await payment.save();

    await writeAuditLog(req, {
      action: "update",
      entityType: "Payment",
      entityId: payment._id,
      labId: String(payment.lab),
      branchId: String(payment.branchId),
      changes: {
        orderId: payment.orderId,
        paymentEntryIndex: entryIndex,
        amount: entries[entryIndex].amount,
        method: { from: previousMethod, to: normalizedMethod },
      },
      metadata: {
        summary: `Payment method changed from ${String(previousMethod || "unknown").toUpperCase()} to ${normalizedMethod.toUpperCase()}`,
        transactionId: payment.transactionId,
        patient: payment.name,
      },
    });

    return NextResponse.json(payment, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to update payment method" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  let session: mongoose.ClientSession | undefined;
  try {
    const body = await req.json();
    console.log('Received payment data:', body);
    // Validate required fields
    const required = [
      'labId', 'name', 'amount',  'userId', 'branchId', 'user',
      'payments', 'branch', 'patient', 'slug',  'orderId', 'bDate'
    ];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    const paymentLines = Array.isArray(body.payments) ? body.payments : [];
    const allowedMethods = ['cash', 'pos', 'transfer', 'other'];
    if (!paymentLines.length || paymentLines.some((line: any) => !allowedMethods.includes(String(line?.method || '').trim().toLowerCase()) || !Number.isFinite(Number(line?.amount)) || Number(line.amount) < 0)) {
      return NextResponse.json({ error: 'payments must contain valid methods and non-negative amounts' }, { status: 400 });
    }
    const declaredAmount = Number(body.amount);
    const linesTotal = paymentLines.reduce((sum: number, line: any) => sum + Number(line.amount), 0);
    if (!Number.isFinite(declaredAmount) || declaredAmount < 0 || Math.abs(linesTotal - declaredAmount) > 0.01) {
      return NextResponse.json({ error: 'Payment lines must add up to amount' }, { status: 400 });
    }
    const referralLedger = body.referralLedger;
    if (referralLedger && (!referralLedger.referrer || !Array.isArray(referralLedger.tests))) {
      return NextResponse.json({ error: 'A referral ledger requires a referrer and tests' }, { status: 400 });
    }

    session = await mongoose.startSession();
    const transactionResult: { payment: IPayment | null; paymentCreated: boolean } = {
      payment: null,
      paymentCreated: false,
    };
    await session.withTransaction(async () => {
      transactionResult.payment = await Payment.findOne({ orderId: body.orderId, isCancelled: { $ne: true } }).session(session!);
      if (!transactionResult.payment) {
        const [createdPayment] = await Payment.create([{
          lab: body.labId,
          name: body.name,
          payments: body.payments,
          branch: body.branch,
          branchId: body.branchId,
          patient: body.patient,
          slug: body.slug,
          orderId: body.orderId,
          businessDate: body.bDate,
          userId: body.userId,
          user: body.user,
          status: 'completed',
          isFullPayment: body.isFullPayment === true,
          transactionId: body.transactionId,
          isCancelled: body.isCancelled || false,
        }], { session });
        transactionResult.payment = createdPayment;
        transactionResult.paymentCreated = true;
      }

      if (referralLedger) {
        const existingLedger = await ReferralLedger.findOne({ testOrder: body.orderId }).session(session!);
        if (!existingLedger) {
          await ReferralLedger.create([{
            testOrder: body.orderId,
            referrer: referralLedger.referrer,
            tests: referralLedger.tests,
            amount: Number(referralLedger.amount ?? body.amount),
            bonus: Number(referralLedger.bonus ?? 0),
            branchId: body.branchId,
            lab: body.labId,
            status: referralLedger.status || 'pending',
            user: body.userId,
            businessDate: body.bDate,
          }], { session });
        }
      }
    });

    if (!transactionResult.payment) {
      throw new Error('Payment was not created');
    }
    if (transactionResult.paymentCreated) {
      await writeAuditLog(req, {
        action: 'create',
        entityType: 'Payment',
        entityId: transactionResult.payment._id,
        labId: body.labId,
        branchId: body.branchId,
        changes: { orderId: body.orderId, payments: body.payments, status: 'completed' },
      });
    }
    return NextResponse.json(transactionResult.payment, { status: transactionResult.paymentCreated ? 201 : 200 });
  } catch (error) {
    console.log('Error creating payment:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  } finally {
    await session?.endSession();
  }
}
