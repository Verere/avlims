import mongoose, { Schema, Document, Types } from 'mongoose';
import { TestOrderStatus } from './TestOrderItem';

export interface ITestOrderStatusHistory extends Document {
  testOrderItem: Types.ObjectId;
  lab: Types.ObjectId;
  status: TestOrderStatus;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}

const TestOrderStatusHistorySchema = new Schema<ITestOrderStatusHistory>({
  testOrderItem: { type: Schema.Types.ObjectId, ref: 'TestOrderItem', required: true },
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  status: { type: String, enum: ['REGISTERED', 'COLLECTED', 'RUNNING', 'COMPLETED', 'VERIFIED'], required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.models.TestOrderStatusHistory || mongoose.model<ITestOrderStatusHistory>('TestOrderStatusHistory', TestOrderStatusHistorySchema);
