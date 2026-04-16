import mongoose from 'mongoose';
// Assume Payment model exists
import Payment from '../models/Payment';
import { dbConnect } from '../lib/mongodb';

export async function processPayment({
  labId,
  paymentReference,
  amount,
  paidBy,
  paidAt,
  userId,
}: {
  labId: string;
  paymentReference: string;
  amount: number;
  paidBy: string;
  paidAt: Date;
  userId?: string;
}) {
  await dbConnect();
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      // Check for existing payment by reference and lab
      const existing = await Payment.findOne({
        lab: labId,
        paymentReference,
      }).session(session);
      if (existing) {
        result = { payment: existing, idempotent: true };
        return;
      }
      // Create new payment record
      const payment = await Payment.create([
        {
          lab: labId,
          paymentReference,
          amount,
          paidBy,
          paidAt,
          createdBy: userId,
        },
      ], { session });
      result = { payment: payment[0], idempotent: false };
    });
    return result;
  } finally {
    session.endSession();
  }
}
