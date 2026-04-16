import mongoose from 'mongoose';
// Assume TestOrderItem, Invoice, ReferralLedger, FinancialLog, and TestReferralProfile models exist
import TestOrderItem from '../models/TestOrderItem';
import Invoice from '../models/Invoice';
import ReferralLedger from '../models/ReferralLedger';
import FinancialLog from '../models/FinancialLog';
import TestReferralProfile from '../models/TestReferralProfile';
import { dbConnect } from '../lib/mongodb';

export async function checkoutTestOrders({
  labId,
  testOrderItemIds,
  userId,
}: {
  labId: string;
  testOrderItemIds: string[];
  userId?: string;
}) {
  await dbConnect();
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      // Fetch test order items
      const testOrderItems = await TestOrderItem.find({
        _id: { $in: testOrderItemIds },
        lab: labId,
        status: { $ne: 'INVOICED' },
      }).session(session);
      if (testOrderItems.length === 0) throw new Error('No valid test order items to invoice');

      // Check for existing invoice (idempotency)
      const existingInvoice = await Invoice.findOne({
        lab: labId,
        'items.testOrderItem': { $all: testOrderItemIds },
      }).session(session);
      if (existingInvoice) {
        result = { invoice: existingInvoice, idempotent: true };
        return;
      }

      // Calculate totals and referral bonuses
      let total = 0;
      let referralBonuses = [];
      for (const item of testOrderItems) {
        total += item.price;
        // Calculate referral bonus if applicable
        if (item.referredBy) {
          const profile = await TestReferralProfile.findOne({ testType: item.testType, lab: labId }).session(session);
          if (profile) {
            const bonus = item.price * (profile.referralPercentage / 100);
            referralBonuses.push({
              testOrderItem: item._id,
              referredBy: item.referredBy,
              amount: bonus,
            });
          }
        }
      }

      // Create invoice
      const invoice = await Invoice.create([
        {
          lab: labId,
          items: testOrderItems.map(item => ({ testOrderItem: item._id, price: item.price })),
          total,
          createdBy: userId,
        },
      ], { session });

      // Mark test order items as invoiced
      await TestOrderItem.updateMany(
        { _id: { $in: testOrderItemIds } },
        { $set: { status: 'INVOICED' } },
        { session }
      );

      // Write referral bonuses to ledger
      for (const bonus of referralBonuses) {
        // Prevent duplicate accruals
        const alreadyAccrued = await ReferralLedger.exists({
          testOrderItem: bonus.testOrderItem,
          lab: labId,
          type: 'BONUS',
        }).session(session);
        if (!alreadyAccrued) {
          await ReferralLedger.create([
            {
              lab: labId,
              testOrderItem: bonus.testOrderItem,
              referredBy: bonus.referredBy,
              amount: bonus.amount,
              type: 'BONUS',
              changedBy: userId,
            },
          ], { session });
        }
      }

      // Log financial actions
      await FinancialLog.create([
        {
          lab: labId,
          action: 'INVOICE_CREATED',
          details: { invoiceId: invoice[0]._id, testOrderItemIds, total },
          createdBy: userId,
        },
      ], { session });

      result = { invoice: invoice[0], idempotent: false };
    });
    return result;
  } finally {
    session.endSession();
  }
}
