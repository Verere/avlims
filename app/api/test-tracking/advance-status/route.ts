import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../../lib/mongodb';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { id, userId } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing test order item id' }, { status: 400 });
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  // Fetch current item
  const item = await TestOrderItem.findOne({ _id: new mongoose.Types.ObjectId(id) });
  if (!item) return NextResponse.json({ error: 'Test order item not found' }, { status: 404 });
  // Determine next status
  const statusFlow = ['REGISTERED', 'COLLECTED', 'RUNNING', 'COMPLETED', 'VERIFIED'];
  const currentIdx = statusFlow.indexOf(item.status);
  if (currentIdx === -1 || currentIdx === statusFlow.length - 1) {
    return NextResponse.json({ error: 'No further status transitions allowed' }, { status: 400 });
  }
  const nextStatus = statusFlow[currentIdx + 1];
  // Update status and push to history
  const now = new Date();
 await TestOrderItem.updateOne(
  { _id: item._id },
  {
    $set: { status: nextStatus },
    $push: { history: { status: nextStatus, at: now, changedBy: userId } },
  } as any
);
  return NextResponse.json({ id, status: nextStatus, at: now });
}
