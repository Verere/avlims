import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferrer extends Document {
  name: string;
  address: string;
  phone: string;
  refClinic: Types.ObjectId;
  bank: string;
  account: string;
  email: string;
  isCancelled: boolean;
  slug: string;
  branchId: Types.ObjectId;
}

const ReferrerSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  refClinic: { type: Schema.Types.ObjectId, ref: 'RefClinic', required: true },
  bank: { type: String, required: true },
  account: { type: String, required: true },
  email: { type: String },
  slug: { type: String, required: true, },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isCancelled: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export default mongoose.models.Referrer || mongoose.model<IReferrer>('Referrer', ReferrerSchema);
