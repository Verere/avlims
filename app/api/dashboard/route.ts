import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Collections
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  const Inventory = mongoose.connection.collection('inventories');

  // 1. Today's test volume
  const testVolume = await TestOrderItem.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow },
  });

  // 2. Pending collections
  const pendingCollections = await TestOrderItem.countDocuments({
    status: 'REGISTERED',
    createdAt: { $gte: today, $lt: tomorrow },
  });

  // 3. Low inventory (threshold: 10 units)
  const lowInventory = await Inventory.find({ stock: { $lte: 10 } })
    .project({ item: 1, stock: 1, _id: 0 })
    .toArray();

  return NextResponse.json({
    testVolume,
    pendingCollections,
    lowInventory,
  });
}
