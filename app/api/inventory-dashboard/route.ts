import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  const Inventory = mongoose.connection.collection('inventories');
  // Example: get all inventory items, with daily consumption (dummy field)
  const items = await Inventory.find({}).toArray();
  // Add dailyConsumption dummy value for demo
  const withConsumption = items.map(i => ({
    id: i._id.toString(),
    name: i.name,
    stock: i.stock,
    min: i.min,
    unit: i.unit,
    dailyConsumption: i.dailyConsumption || Math.floor(Math.random() * 10) + 1,
  }));
  return NextResponse.json(withConsumption);
}
