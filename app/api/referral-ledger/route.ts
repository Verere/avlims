
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import ReferralLedger from '@/models/ReferralLedger';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const fromDate = req.nextUrl.searchParams.get('fromDate');
    const toDate = req.nextUrl.searchParams.get('toDate');
    const date = req.nextUrl.searchParams.get('date');
    const status = req.nextUrl.searchParams.get('status');

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const filter: any = { branchId };
    if (status === 'pending' || status === 'paid') {
      filter.status = status;
    }

    // Support both date-range (fromDate/toDate) and single-date (date) filtering
    if (fromDate && toDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`);
      const end = new Date(`${toDate}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.createdAt = { $gte: start, $lte: end };
    }

    const rows = await ReferralLedger.find(filter)
      .populate('referrer', 'name')
      .populate('testOrder', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    console.log('Received referral ledger data:', body);
    // Validate required fields
    const required = ['order', 'referrer', 'amount', 'bonus', 'branchId', 'lab', 'user'];
    for (const field of required) {
        
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    // Create referral ledger entry
    const ledger = await ReferralLedger.create({
      testOrder: body.order, // maps to testOrder in schema
      referrer: body.referrer,
      amount: body.amount,
      bonus: body.bonus,
      branchId: body.branchId,
      lab: body.lab,
      status: body.status || 'pending',
      user: body.user,
      businessDate: body.businessDate,
    });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating referral ledger entry:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
