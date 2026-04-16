import mongoose from 'mongoose';
import TestOrderItem, { ITestOrderItem, TestOrderStatus } from '../models/TestOrderItem';
import TestOrderStatusHistory from '../models/TestOrderStatusHistory';
import { dbConnect } from '../lib/mongodb';

const STATUS_FLOW: TestOrderStatus[] = [
  'REGISTERED',
  'COLLECTED',
  'RUNNING',
  'COMPLETED',
  'VERIFIED',
];

export async function advanceTestOrderStatus({
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
    const testOrderItem = await TestOrderItem.findOne({ _id: testOrderItemId, lab: labId }).session(session);
    if (!testOrderItem) throw new Error('Test order item not found or lab mismatch');

    const currentIndex = STATUS_FLOW.indexOf(testOrderItem.status);
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) {
      throw new Error('No further status transitions allowed');
    }
    const nextStatus = STATUS_FLOW[currentIndex + 1];

    // Create status history record
    const history = await TestOrderStatusHistory.create([
      {
        testOrderItem: testOrderItem._id,
        lab: labId,
        status: nextStatus,
        changedBy: userId,
      },
    ], { session });

    // Update test order item
    testOrderItem.status = nextStatus;
    testOrderItem.statusHistory.push(history[0]._id);
    await testOrderItem.save({ session });

    await session.commitTransaction();
    return testOrderItem;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
