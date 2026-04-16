import { NextRequest, NextResponse } from 'next/server';
import { processPayment } from '../../../services/paymentService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { labId, paymentReference, amount, paidBy, paidAt, userId } = body;
    if (!labId || !paymentReference || !amount || !paidBy || !paidAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await processPayment({ labId, paymentReference, amount, paidBy, paidAt: new Date(paidAt), userId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
