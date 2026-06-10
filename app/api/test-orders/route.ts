import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Order from '../../../models/Order';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // Directly create an Order document with all fields from the payload
    const payload = {
      ...body,
      bonus: Number(body?.bonus ?? 0),
    };
    const order = await Order.create(payload);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating test order:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch');
    const branchId = url.searchParams.get('branchId');
    let query: any = {};
    if (branchId) {
      query.branchId = branchId;
    } else if (branch) {
      query.branch = branch;
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

