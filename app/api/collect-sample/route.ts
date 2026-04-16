import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { barcode } = await req.json();
  if (!barcode) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 });
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  // Find by barcode (assume barcode is stored as a field)
  const item = await TestOrderItem.findOne({ barcode });
  if (!item) return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
  if (item.status === 'COLLECTED') {
    return NextResponse.json({ warning: 'Sample already collected' }, { status: 200 });
  }
  // Mark as collected
  const now = new Date();
 await TestOrderItem.updateOne(
  { _id: item._id },
  {
    $set: { status: 'COLLECTED' },
    $push: { history: { status: 'COLLECTED', at: now } },
  } as any
);
  return NextResponse.json({ success: true, at: now });
}
