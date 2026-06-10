import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferralLedger extends Document {
  lab: Types.ObjectId;
  referrer: Types.ObjectId;
  testOrder: Types.ObjectId;
  amount: number;
  bonus: number;
  status: 'pending' | 'paid';
  user: string;
  branchId: Types.ObjectId;
  businessDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralLedgerSchema = new Schema<IReferralLedger>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  referrer: { type: Schema.Types.ObjectId, ref: 'Referrer', required: true },
  testOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  bonus: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  businessDate: { type: String },
  user: { type: String, required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

export default mongoose.models.ReferralLedger || mongoose.model<IReferralLedger>('ReferralLedger', ReferralLedgerSchema);
