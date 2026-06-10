import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const payload = {
      ...body,
      bonus: Number(body?.bonus ?? 0),
    };
    const order = await Order.create(payload);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  await dbConnect();
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
