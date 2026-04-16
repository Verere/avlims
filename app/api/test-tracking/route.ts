import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  const TestOrderItem = mongoose.connection.collection('testorderitems');
  // Dummy join for patient and test name (replace with real lookups if needed)
  const items = await TestOrderItem.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 1,
        patient: 1,
        test: "$testType",
        status: 1,
        history: 1,
      },
    },
  ]).toArray();
  // Optionally join with patient/test collections for names
  return NextResponse.json(items.map(i => ({
    id: i._id.toString(),
    patient: i.patient,
    test: i.test,
    status: i.status,
    history: i.history || [],
  })));
}
