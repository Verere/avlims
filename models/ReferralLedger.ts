import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferralLedger extends Document {
  lab: Types.ObjectId;
  referrer: Types.ObjectId;
  testOrderItem: Types.ObjectId;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const ReferralLedgerSchema = new Schema<IReferralLedger>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  testOrderItem: { type: Schema.Types.ObjectId, ref: 'TestOrderItem', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true });

export default mongoose.models.ReferralLedger || mongoose.model<IReferralLedger>('ReferralLedger', ReferralLedgerSchema);
