import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  // For demo, use today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Collections
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  const InventoryLedger = mongoose.connection.collection('inventoryledgers');
  const Invoice = mongoose.connection.collection('invoices');

  // Total tests
  const totalTests = await TestOrderItem.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
  // Total revenue
  const totalRevenueAgg = await TestOrderItem.aggregate([
    { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]).toArray();
  const totalRevenue = totalRevenueAgg[0]?.total || 0;
  // Consumables, reagents, lab wear used
  const usageAgg = await InventoryLedger.aggregate([
    { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: "$category", used: { $sum: "$quantity" } } },
  ]).toArray();
  const consumablesUsed = usageAgg.find(u => u._id === 'consumable')?.used || 0;
  const reagentsUsed = usageAgg.find(u => u._id === 'reagent')?.used || 0;
  const labWearUsed = usageAgg.find(u => u._id === 'lab wear')?.used || 0;
  // Outstanding balances
  const outstandingAgg = await Invoice.aggregate([
    { $match: { createdAt: { $gte: today, $lt: tomorrow }, balance: { $gt: 0 } } },
    { $group: { _id: null, outstanding: { $sum: "$balance" } } },
  ]).toArray();
  const outstandingBalance = outstandingAgg[0]?.outstanding || 0;

  return NextResponse.json({
    totalTests,
    totalRevenue,
    consumablesUsed,
    reagentsUsed,
    labWearUsed,
    outstandingBalance,
  });
}
