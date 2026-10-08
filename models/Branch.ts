import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  slug: string;
  branch: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  referralBonusPolicy?: {
    defaultPercentage: number;
    exceptions: Array<{
      type?: "test" | "panel";
      testId?: string;
      testName?: string;
      panelId?: string;
      panelName?: string;
      percentage: number;
    }>;
  };
}

const BranchSchema = new Schema<IBranch>({
  slug: { type: String, required: true, unique: true },
  branch: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: { type: String },
  email: { type: String },
  website: { type: String },
  referralBonusPolicy: {
    type: {
      defaultPercentage: { type: Number, default: 0 },
      exceptions: [
        {
          type: { type: String, enum: ["test", "panel"], default: "test" },
          testId: { type: String },
          testName: { type: String },
          panelId: { type: String },
          panelName: { type: String },
          percentage: { type: Number, default: 0 },
        },
      ],
    },
    default: {
      defaultPercentage: 0,
      exceptions: [],
    },
  },
});

export default mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
