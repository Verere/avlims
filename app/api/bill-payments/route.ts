import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Bill from '@/models/Bill';
import BillPayment from '@/models/BillPayment';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const date = req.nextUrl.searchParams.get('date');

    const filter: any = { status: 'posted' };
    if (branchId) {
      filter.branchId = branchId;
    }

    if (date) {
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

    const bill = await Bill.findById(billId);
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const currentBalance = Number(bill.balance || 0);
    if (currentBalance <= 0) {
      return NextResponse.json({ error: 'This bill is already settled' }, { status: 400 });
    }

    if (paidAmount > currentBalance) {
      return NextResponse.json({ error: 'Payment amount cannot be greater than bill balance' }, { status: 400 });
    }

    const payment = await BillPayment.create({
      billId: bill._id,
      orderId: bill.orderId,
      labId: bill.labId,
      branchId: bill.branchId,
      patient: bill.patient,
      referrer: bill.referrer,
      billTo: bill.billTo,
      billToName: bill.billToName,
      billToRef: bill.billToRef,
      amount: paidAmount,
      lines: [
        {
          method: paymentMethod,
          amount: paidAmount,
          reference: reference ? String(reference) : undefined,
        },
      ],
      status: 'posted',
      businessDate: bill.businessDate || new Date(),
      userId: userId || undefined,
      user: user ? String(user) : 'system',
      note: note ? String(note) : undefined,
    });

    const totals = await BillPayment.aggregate([
      {
        $match: {
          billId: bill._id,
          status: 'posted',
        },
      },
      {
        $group: {
          _id: '$billId',
          totalPaid: { $sum: '$amount' },
        },
      },
    ]);

    bill.paid = Number(totals[0]?.totalPaid || 0);
    bill.balance = Math.max(Number(bill.amount || 0) - Number(bill.paid || 0), 0);
    bill.isSettled = Number(bill.paid || 0) >= Number(bill.amount || 0);
    await bill.save();

    return NextResponse.json({ payment, bill }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
