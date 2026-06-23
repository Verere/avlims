import mongoose from 'mongoose';
// Assume TestOrderItem, ReferralLedger, and TestReferralProfile models exist
import TestOrderItem from '../models/TestOrderItem';
import ReferralLedger from '../models/ReferralLedger';
import TestReferralProfile from '../models/TestReferralProfile';
import Referrer from '@/models/Referrer';
import { dbConnect } from '../lib/mongodb';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getReferrers(branchId?: string) {
  await dbConnect();
  const filter: any = { isCancelled: false };
  if (branchId) filter.branchId = branchId;
  return Referrer.find(filter)
    .populate('refClinic', 'name')
    .sort({ createdAt: -1 })
    .lean();
}



export async function createReferrer(data: any) {
  await dbConnect();
  const branchId = data.branchId || data.branch;
  if (!branchId || !data.slug) {
    throw new Error("branchId and slug are required to create a referrer");
  }

  const name = String(data?.name || '').trim();
  const phone = String(data?.phone || '').trim();
  const email = String(data?.email || '').trim();

  const duplicateConditions: any[] = [
    { phone: { $regex: `^${escapeRegex(phone)}$`, $options: 'i' } },
    {
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
      phone: { $regex: `^${escapeRegex(phone)}$`, $options: 'i' },
    },
  ];
  if (email) {
    duplicateConditions.push({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
  }

  const duplicate = await Referrer.findOne({
    branchId,
    isCancelled: false,
    $or: duplicateConditions,
  }).lean();

  if (duplicate) {
    throw new Error('A referrer with the same information already exists for this branch');
  }

  const payload = {
    ...data,
    branchId,
  };

  const referrer = await Referrer.create(payload);
  return referrer;
}

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
          tests: testOrderItem.tests,
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
