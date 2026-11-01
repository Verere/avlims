import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Bill from '@/models/Bill';
import BillPayment from '@/models/BillPayment';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { writeAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const date = req.nextUrl.searchParams.get('date');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    const filter: any = { status: 'posted' };
    if (branchId) {
      filter.branchId = branchId;
    }

    if (from || to) {
      if (!from || !to) return NextResponse.json({ error: 'Both from and to dates are required' }, { status: 400 });
      const start = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${to}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to || start > end) {
        return NextResponse.json({ error: 'Invalid date range. Use YYYY-MM-DD' }, { status: 400 });
      }
      const exclusiveEnd = new Date(end);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      filter.createdAt = { $gte: start, $lt: exclusiveEnd };
    } else if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.createdAt = { $gte: start, $lte: end };
    }

    const rows = await BillPayment.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const { billId, amount, method, reference, note, userId, user } = body || {};

    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }

    const paidAmount = Number(amount || 0);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }

    const paymentMethod = String(method || '').trim().toLowerCase();
    if (!['cash', 'transfer', 'pos', 'other'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    if (!mongoose.isValidObjectId(billId)) return NextResponse.json({ error: 'Invalid billId' }, { status: 400 });
    const session = await mongoose.startSession();
    let payment: any;
    let updatedBill: any;
    try {
      await session.withTransaction(async () => {
        const bill = await Bill.findById(billId).session(session);
        if (!bill) throw Object.assign(new Error('Bill not found'), { status: 404 });
        if (Number(bill.balance || 0) <= 0) throw Object.assign(new Error('This bill is already settled'), { status: 400 });
        if (paidAmount > Number(bill.balance || 0)) throw Object.assign(new Error('Payment amount cannot be greater than bill balance'), { status: 400 });

        // Backfill the original checkout receipt for bills created before initial
        // collections were written to the BillPayment ledger.
        const priorTotals = await BillPayment.aggregate([
          { $match: { billId: bill._id, status: 'posted', isCancelled: { $ne: true } } },
          { $group: { _id: '$billId', totalPaid: { $sum: '$amount' } } },
        ]).session(session);
        const ledgerPaid = Number(priorTotals[0]?.totalPaid || 0);
        const openingPaid = Math.max(Number(bill.paid || 0) - ledgerPaid, 0);
        const checkoutOrder = await Order.findById(bill.orderId).session(session);
        if (checkoutOrder && checkoutOrder.checkoutPaid === undefined) {
          const amountDue = Number(checkoutOrder.amountDue ?? Math.max(Number(checkoutOrder.amount || 0) - Number(checkoutOrder.discount || 0), 0));
          const initialReceipt = await BillPayment.aggregate([
            { $match: { billId: bill._id, status: 'posted', isCancelled: { $ne: true }, isInitialReceipt: true } },
            { $group: { _id: '$billId', totalPaid: { $sum: '$amount' } } },
          ]).session(session);
          const recordedCheckoutPaid = Number(initialReceipt[0]?.totalPaid ?? (openingPaid > 0.01 ? openingPaid : checkoutOrder.amountPaid || 0));
          checkoutOrder.checkoutPaid = recordedCheckoutPaid;
          checkoutOrder.checkoutCredit = Math.max(amountDue - recordedCheckoutPaid, 0);
          await checkoutOrder.save({ session });
        }
        if (openingPaid > 0.01) {
          const originalPayment = await Payment.findOne({ orderId: bill.orderId }).session(session);
          const originalLines = Array.isArray(originalPayment?.payments) ? originalPayment.payments
            .filter((line: any) => Number(line.amount) > 0)
            .map((line: any) => ({ method: ['cash', 'pos', 'transfer', 'other'].includes(String(line.method).toLowerCase()) ? String(line.method).toLowerCase() : 'other', amount: Number(line.amount) })) : [];
          const linesTotal = originalLines.reduce((sum: number, line: any) => sum + line.amount, 0);
          const openingLines = Math.abs(linesTotal - openingPaid) <= 0.01
            ? originalLines
            : [{ method: 'other', amount: openingPaid }];
          await BillPayment.create([{
            billId: bill._id, orderId: bill.orderId, labId: bill.labId, branchId: bill.branchId,
            patient: bill.patient, referrer: bill.referrer, billTo: bill.billTo, billToName: bill.billToName,
            billToRef: bill.billToRef, amount: openingPaid, isInitialReceipt: true, lines: openingLines, status: 'posted',
            businessDate: bill.businessDate || new Date(), user: 'system', note: 'Recovered initial checkout payment for legacy bill',
          }], { session });
        }

        [payment] = await BillPayment.create([{
          billId: bill._id, orderId: bill.orderId, labId: bill.labId, branchId: bill.branchId,
          patient: bill.patient, referrer: bill.referrer, billTo: bill.billTo, billToName: bill.billToName,
          billToRef: bill.billToRef, amount: paidAmount,
          lines: [{ method: paymentMethod, amount: paidAmount, reference: reference ? String(reference) : undefined }],
          status: 'posted', businessDate: new Date(), userId: userId || undefined,
          user: user ? String(user) : 'system', note: note ? String(note) : undefined,
        }], { session });

        const totals = await BillPayment.aggregate([
          { $match: { billId: bill._id, status: 'posted', isCancelled: { $ne: true } } },
          { $group: { _id: '$billId', totalPaid: { $sum: '$amount' } } },
        ]).session(session);
        bill.paid = Number(totals[0]?.totalPaid || 0);
        bill.balance = Math.max(Number(bill.amount || 0) - bill.paid, 0);
        bill.isSettled = bill.balance <= 0;
        await bill.save({ session });
        await Order.updateOne({ _id: bill.orderId }, { $set: { amountPaid: bill.paid, bal: bill.balance } }, { session });
        updatedBill = bill;
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create bill payment' }, { status: error.status || 400 });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ payment, bill: updatedBill }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  let session: mongoose.ClientSession | undefined;
  try {
    const body = await req.json();
    const paymentId = String(body?.paymentId || '');
    if (!mongoose.isValidObjectId(paymentId)) {
      return NextResponse.json({ error: 'Invalid paymentId' }, { status: 400 });
    }

    session = await mongoose.startSession();
    let payment: any;
    let bill: any;
    await session.withTransaction(async () => {
      payment = await BillPayment.findById(paymentId).session(session!);
      if (!payment) throw Object.assign(new Error('Bill payment not found'), { status: 404 });
      if (payment.status === 'reversed') throw Object.assign(new Error('Bill payment is already reversed'), { status: 409 });

      bill = await Bill.findById(payment.billId).session(session!);
      if (!bill) throw Object.assign(new Error('Bill not found'), { status: 404 });
      payment.status = 'reversed';
      await payment.save({ session });

      const totals = await BillPayment.aggregate([
        { $match: { billId: bill._id, status: 'posted', isCancelled: { $ne: true } } },
        { $group: { _id: '$billId', totalPaid: { $sum: '$amount' } } },
      ]).session(session!);
      bill.paid = Number(totals[0]?.totalPaid || 0);
      bill.balance = Math.max(Number(bill.amount || 0) - bill.paid, 0);
      bill.isSettled = bill.balance <= 0;
      await bill.save({ session });
      await Order.updateOne({ _id: bill.orderId }, { $set: { amountPaid: bill.paid, bal: bill.balance } }, { session });
    });

    await writeAuditLog(req, {
      action: 'update', entityType: 'BillPayment', entityId: payment._id,
      labId: String(payment.labId), branchId: String(payment.branchId),
      changes: { status: { from: 'posted', to: 'reversed' }, billId: String(payment.billId), amount: payment.amount },
      metadata: { summary: 'Bill payment reversed' },
    });
    return NextResponse.json({ payment, bill }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reverse bill payment' }, { status: error.status || 400 });
  } finally {
    await session?.endSession();
  }
}
