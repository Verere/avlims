import mongoose from 'mongoose';
import TestOrderItem, { ITestOrderItem } from '../models/TestOrderItem';
// Assume Inventory, InventoryLedger, and TestConsumptionProfile models exist
import Inventory from '../models/Inventory';
import InventoryLedger from '../models/InventoryLedger';
import TestConsumptionProfile from '../models/TestConsumptionProfile';
import { dbConnect } from '../lib/mongodb';

export async function completeTestOrderItem({
  testOrderItemId,
  labId,
  userId,
}: {
  testOrderItemId: string;
  labId: string;
  userId?: string;
}): Promise<ITestOrderItem | null> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Fetch the test order item
    const testOrderItem = await TestOrderItem.findOne({ _id: testOrderItemId, lab: labId }).session(session);
    if (!testOrderItem) throw new Error('Test order item not found or lab mismatch');
    if (testOrderItem.status !== 'COMPLETED') throw new Error('Test order item is not marked COMPLETED');

    // 4. Prevent double deduction (check if already deducted)
    const alreadyDeducted = await InventoryLedger.exists({
      testOrderItem: testOrderItemId,
      lab: labId,
      type: 'CONSUMPTION',
    }).session(session);
    if (alreadyDeducted) throw new Error('Inventory already deducted for this test order item');

    // 1. Fetch test consumption profile
    const profile = await TestConsumptionProfile.findOne({ testType: testOrderItem.testType, lab: labId }).session(session);
    if (!profile) throw new Error('Test consumption profile not found');

    // 2. Deduct inventory stock and 3. Write to inventory ledger
    for (const item of profile.items) {
      // Deduct inventory
      const inventory = await Inventory.findOneAndUpdate(
        { lab: labId, item: item.itemId },
        { $inc: { stock: -item.quantity } },
        { new: true, session }
      );
      if (!inventory) throw new Error(`Inventory item not found: ${item.itemId}`);
      if (inventory.stock < 0) throw new Error(`Insufficient stock for item: ${item.itemId}`);
      // Write to ledger
      await InventoryLedger.create([
        {
          lab: labId,
          item: item.itemId,
          quantity: item.quantity,
          testOrderItem: testOrderItemId,
          type: 'CONSUMPTION',
          changedBy: userId,
        },
      ], { session });
    }

    await session.commitTransaction();
    return testOrderItem;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
