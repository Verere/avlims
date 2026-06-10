import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubCategory extends Document {
  name: string;
  category: Types.ObjectId;
  slug: string;
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  isCancelled: boolean;
}

const SubCategorySchema = new Schema<ISubCategory>({
  name: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  slug: { type: String, required: true },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isCancelled: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.SubCategory || mongoose.model<ISubCategory>('SubCategory', SubCategorySchema);
