import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { testOrderCreationSchema } from '../../../lib/zodSchemas';
import { dbConnect } from '../../../lib/mongodb';
import mongoose from 'mongoose';

// Dummy TestOrderItem model for demonstration
const TestOrderItem = mongoose.connection.collection('testorderitems');

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // Validate input
    const parsed = testOrderCreationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    // Insert test order item(s)
    const { lab, patient, testType, orderedBy, price, referredBy } = parsed.data;
    const doc = {
      lab: new mongoose.Types.ObjectId(lab),
      patient: new mongoose.Types.ObjectId(patient),
      testType,
      orderedBy: new mongoose.Types.ObjectId(orderedBy),
      price,
      referredBy: referredBy ? new mongoose.Types.ObjectId(referredBy) : undefined,
      status: 'REGISTERED',
      createdAt: new Date(),
    };
    const result = await TestOrderItem.insertOne(doc);
    return NextResponse.json({ id: result.insertedId, ...doc }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
