import { NextRequest, NextResponse } from 'next/server';
import { checkoutTestOrders } from '../../../services/checkoutService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { labId, testOrderItemIds, userId } = body;
    if (!labId || !Array.isArray(testOrderItemIds) || testOrderItemIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await checkoutTestOrders({ labId, testOrderItemIds, userId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
