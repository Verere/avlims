import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

// Drilldown endpoints for each KPI
export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (type === 'tests') {
    const TestOrderItem = mongoose.connection.collection('testorderitems');
    const items = await TestOrderItem.find({ createdAt: { $gte: today, $lt: tomorrow } }).toArray();
    return NextResponse.json(items);
  }
  if (type === 'revenue') {
    const TestOrderItem = mongoose.connection.collection('testorderitems');
    const items = await TestOrderItem.find({ createdAt: { $gte: today, $lt: tomorrow } }, { projection: { price: 1, patient: 1, testType: 1 } }).toArray();
    return NextResponse.json(items);
  }
  if (type === 'consumables' || type === 'reagents' || type === 'labwear') {
    const InventoryLedger = mongoose.connection.collection('inventoryledgers');
    const category = type === 'consumables' ? 'consumable' : type === 'reagents' ? 'reagent' : 'lab wear';
    const items = await InventoryLedger.find({ createdAt: { $gte: today, $lt: tomorrow }, category }).toArray();
    return NextResponse.json(items);
  }
  if (type === 'outstanding') {
    const Invoice = mongoose.connection.collection('invoices');
    const items = await Invoice.find({ createdAt: { $gte: today, $lt: tomorrow }, balance: { $gt: 0 } }).toArray();
    return NextResponse.json(items);
  }
  return NextResponse.json({ error: 'Invalid drilldown type' }, { status: 400 });
}
