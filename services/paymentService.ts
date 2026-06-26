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
  patientId,
  branch,
  branchId,
  patientName,
  slug,
  userId,
}: {
  labId: string;
  paymentReference: string;
  amount: number;
  paidBy: string;
  paidAt: Date;
  patientId: string;
  branch: string;
  branchId: string;
  patientName: string;
  slug: string;
  userId?: string;
}) {
  await dbConnect();
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      if (!mongoose.Types.ObjectId.isValid(labId)) {
        throw new Error('Invalid labId');
      }
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        throw new Error('Invalid patientId');
      }
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw new Error('Invalid branchId');
      }

      // Check for existing payment by reference and lab
      const existing = await Payment.findOne({
        lab: labId,
        transactionId: paymentReference,
      }).session(session);

      if (existing) {
        result = { payment: existing, idempotent: true };
        return;
      }

      // Create new payment record
      const payment = new Payment({
        lab: labId,
        patient: patientId,
        name: patientName,
        branch,
        branchId,
        orderId: undefined,
        slug,
        businessDate: paidAt.toISOString().slice(0, 10),
        payments: [
          {
            method: paidBy || 'transfer',
            amount: Number(amount || 0),
          },
        ],
        status: 'completed',
        transactionId: paymentReference,
        isCancelled: false,
        userId,
        user: userId || 'system',
      });

      await payment.save({ session });
      result = { payment, idempotent: false };
    });
    return result;
  } finally {
    session.endSession();
  }
}
