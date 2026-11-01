import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  isCancelled: boolean;
  worklistBackfillCompletedAt?: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  isCancelled: { type: Boolean, default: false },
  worklistBackfillCompletedAt: { type: Date },
}, { timestamps: true });

const existingCategoryModel = mongoose.models.Category as mongoose.Model<ICategory> | undefined;
if (existingCategoryModel && !existingCategoryModel.schema.path('worklistBackfillCompletedAt')) {
  existingCategoryModel.schema.add({ worklistBackfillCompletedAt: { type: Date } });
}

export default existingCategoryModel || mongoose.model<ICategory>('Category', CategorySchema);
