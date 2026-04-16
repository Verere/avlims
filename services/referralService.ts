import mongoose from 'mongoose';
// Assume TestOrderItem, ReferralLedger, and TestReferralProfile models exist
import TestOrderItem from '../models/TestOrderItem';
import ReferralLedger from '../models/ReferralLedger';
import TestReferralProfile from '../models/TestReferralProfile';
import { dbConnect } from '../lib/mongodb';

export async function accrueReferralBonus({
  testOrderItemId,
  labId,
  userId,
}: {
  testOrderItemId: string;
  labId: string;
  userId?: string;
}) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // Prevent duplicate accruals
      const alreadyAccrued = await ReferralLedger.exists({
        testOrderItem: testOrderItemId,
        lab: labId,
        type: 'BONUS',
      }).session(session);
      if (alreadyAccrued) throw new Error('Referral bonus already accrued for this test order item');

      // Fetch test order item
      const testOrderItem = await TestOrderItem.findOne({ _id: testOrderItemId, lab: labId }).session(session);
      if (!testOrderItem) throw new Error('Test order item not found or lab mismatch');

      // Fetch referral profile
      const profile = await TestReferralProfile.findOne({ testType: testOrderItem.testType, lab: labId }).session(session);
      if (!profile) throw new Error('Test referral profile not found');

      // Calculate bonus
      const bonus = testOrderItem.price * (profile.referralPercentage / 100);

      // Write to referral ledger
      await ReferralLedger.create([
        {
          lab: labId,
          testOrderItem: testOrderItemId,
          referredBy: testOrderItem.referredBy,
          amount: bonus,
          type: 'BONUS',
          changedBy: userId,
        },
      ], { session });

      result = { bonus };
    });
    return result;
  } finally {
    session.endSession();
  }
}

export async function reverseReferralBonus({
  testOrderItemId,
  labId,
  userId,
}: {
  testOrderItemId: string;
  labId: string;
  userId?: string;
}) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Find the bonus entry
    const bonusEntry = await ReferralLedger.findOne({
      testOrderItem: testOrderItemId,
      lab: labId,
      type: 'BONUS',
    }).session(session);
    if (!bonusEntry) throw new Error('No referral bonus to reverse');

    // Prevent duplicate reversal
    const alreadyReversed = await ReferralLedger.exists({
      testOrderItem: testOrderItemId,
      lab: labId,
      type: 'REVERSAL',
    }).session(session);
    if (alreadyReversed) throw new Error('Referral bonus already reversed for this test order item');

    // Write reversal entry
    await ReferralLedger.create([
      {
        lab: labId,
        testOrderItem: testOrderItemId,
        referredBy: bonusEntry.referredBy,
        amount: -bonusEntry.amount,
        type: 'REVERSAL',
        changedBy: userId,
      },
    ], { session });

    await session.commitTransaction();
    return { reversed: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
