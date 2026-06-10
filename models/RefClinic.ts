import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefClinic extends Document {
  name: string;
  address: string;
  slug: string;
  branchId: Types.ObjectId;
  isCancelled: boolean;
}

const RefClinicSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  slug: { type: String, required: true,  },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isCancelled: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export default mongoose.models.RefClinic || mongoose.model<IRefClinic>('RefClinic', RefClinicSchema);
