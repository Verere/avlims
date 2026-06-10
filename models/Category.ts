import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  isCancelled: boolean;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isCancelled: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
