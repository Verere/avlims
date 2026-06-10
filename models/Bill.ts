import mongoose, { Schema, Document, Types } from 'mongoose';

export type BillTo = 'Patient' | 'RefClinic' | 'Referrer';

export interface IBill extends Document {
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  patient: string;
  referrer: string;
  amount: number;
  paid: number;
  balance: number;
  orderId: Types.ObjectId;
  businessDate: Date;
  billTo: BillTo;
  billToName: String;
  billToRef: String;
  isSettled: boolean;
}

const BillSchema = new Schema<IBill>({
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  patient: { type: String, required: true },
  referrer: { type: String, default: '' },
  amount: { type: Number, required: true },
  paid: { type: Number, required: true },
  balance: { type: Number, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  businessDate: { type: Date, required: true },
  billTo: { type: String, enum: ['Patient', 'RefClinic', 'Referrer'], required: true },
  billToName: { type: String },
  billToRef: { type: String },
  isSettled: { type: Boolean, default: false },
});

if (mongoose.models.Bill) {
  delete mongoose.models.Bill;
}

export default mongoose.model<IBill>('Bill', BillSchema);
