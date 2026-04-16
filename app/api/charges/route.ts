import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
  await dbConnect();
  // Dummy aggregation: group by patient, sum amount and paid
  const Charges = mongoose.connection.collection('charges');
  const pipeline = [
    {
      $group: {
        _id: '$patient',
        charges: { $push: '$$ROOT' },
        total: { $sum: '$amount' },
        paid: { $sum: '$paid' },
      },
    },
  ];
  const grouped = await Charges.aggregate(pipeline).toArray();
  // Also flatten for summary
  const all = await Charges.find({}).toArray();
  const total = all.reduce((sum, c) => sum + (c.amount || 0), 0);
  const paid = all.reduce((sum, c) => sum + (c.paid || 0), 0);
  return NextResponse.json({ grouped, total, paid, outstanding: total - paid });
}
