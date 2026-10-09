import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import Payment, { IPayment } from '../../../models/Payment';
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
    console.log('Fetched', payments);
    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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
      transactionResult.payment = body.isFullPayment
        ? await Payment.findOne({ orderId: body.orderId, isFullPayment: true }).session(session!)
        : null;
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