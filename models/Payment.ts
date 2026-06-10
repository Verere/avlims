import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PaymentEntry {
  method: string;
  amount: number;
}

export interface IPayment extends Document {
  lab: Types.ObjectId;
  patient: Types.ObjectId;
  name: string;
  branch: string;
  // testOrderItem: Types.ObjectId;
  branchId: Types.ObjectId;
  orderId?: Types.ObjectId;
  payments: PaymentEntry[];
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  slug: string;
  businessDate?: string;
  userId: Types.ObjectId;
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentEntrySchema = new Schema<PaymentEntry>({
  method: { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const PaymentSchema = new Schema<IPayment>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  name: {type: String, required: true},
  branch: {type: String, required: true},
  // testOrderItem: { type: Schema.Types.ObjectId, ref: 'TestOrderItem', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  slug: { type: String, required: true },
  businessDate: { type: String },
  payments: { type: [PaymentEntrySchema], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String },
  userId:  { type: Schema.Types.ObjectId, ref: 'User' },
  user: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
