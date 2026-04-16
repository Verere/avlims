import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  lab: Types.ObjectId;
  patient: Types.ObjectId;
  testOrderItem: Types.ObjectId;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  testOrderItem: { type: Schema.Types.ObjectId, ref: 'TestOrderItem', required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String },
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
