import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITestReferralProfile extends Document {
  lab: Types.ObjectId;
  testType: string;
  referralRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestReferralProfileSchema = new Schema<ITestReferralProfile>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  testType: { type: String, required: true },
  referralRate: { type: Number, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.TestReferralProfile || mongoose.model<ITestReferralProfile>('TestReferralProfile', TestReferralProfileSchema);
