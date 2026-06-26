import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferralLedger extends Document {
  lab: Types.ObjectId;
  referrer: Types.ObjectId;
  testOrder: Types.ObjectId;
  tests: Array<{
    testId: string;
    testName: string;
    panelId?: string;
    panelName?: string;
    quantity: number;
    amount: number;
    bonus: number;
  }>;
  amount: number;
  bonus: number;
  status: 'pending' | 'paid';
  isCancelled?: boolean;
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
  tests: [
    {
      testId: { type: String, required: true },
      testName: { type: String, required: true },
      panelId: { type: String },
      panelName: { type: String },
      quantity: { type: Number, required: true, default: 1 },
      amount: { type: Number, required: true, default: 0 },
      bonus: { type: Number, required: true, default: 0 },
    },
  ],
  amount: { type: Number, required: true },
  bonus: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  isCancelled: { type: Boolean, default: false },
  businessDate: { type: String },
  user: { type: String, required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

export default mongoose.models.ReferralLedger || mongoose.model<IReferralLedger>('ReferralLedger', ReferralLedgerSchema);
