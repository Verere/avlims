import { NextRequest, NextResponse } from 'next/server';

import Payment from '../../../models/Payment';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get("branchId");
    const query: Record<string, any> = {};
    if (branchId) {
      query.branchId = branchId;
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
    // Create payment document
    const payment = await Payment.create({
      lab: body.labId,
      name: body.name,
      amount: body.amount,
      createdBy: body.userId,
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
      transactionId: body.transactionId,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.log('Error creating payment:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}