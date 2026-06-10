import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  slug: string;
  branch: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

const BranchSchema = new Schema<IBranch>({
  slug: { type: String, required: true, unique: true },
  branch: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: { type: String },
  email: { type: String },
  website: { type: String },
});

export default mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
