import mongoose, { Schema, Document, Types } from 'mongoose';

export type TestOrderStatus = 'REGISTERED' | 'COLLECTED' | 'RUNNING' | 'COMPLETED' | 'VERIFIED';

export interface ITestOrderItem extends Document {
  lab: Types.ObjectId;
  status: TestOrderStatus;
  statusHistory: Types.ObjectId[];
  // ...other fields
}

const TestOrderItemSchema = new Schema<ITestOrderItem>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  status: { type: String, enum: ['REGISTERED', 'COLLECTED', 'RUNNING', 'COMPLETED', 'VERIFIED'], required: true },
  statusHistory: [{ type: Schema.Types.ObjectId, ref: 'TestOrderStatusHistory' }],
  // ...other fields
}, { timestamps: true });

export default mongoose.models.TestOrderItem || mongoose.model<ITestOrderItem>('TestOrderItem', TestOrderItemSchema);
