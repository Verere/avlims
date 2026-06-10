import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPanel extends Document {
  name: string;
  code: string;
  category: string;
  price: number;
  tests: Types.ObjectId[];
  isActive: boolean;
  description?: string;
  slug: string;
  branchId: Types.ObjectId;
  isCancelled: boolean;
}

const PanelSchema = new Schema<IPanel>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    tests: [{ type: Schema.Types.ObjectId, ref: 'Test', required: true }],
    isActive: { type: Boolean, default: true },
    description: { type: String },
    slug: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Panel || mongoose.model<IPanel>('Panel', PanelSchema);
