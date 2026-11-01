import mongoose, { Schema, Document } from 'mongoose';
import type { TransactionIdConfig } from '@/lib/transactionId';

export interface IBranch extends Document {
  slug: string;
  branch: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  transactionIdConfig?: TransactionIdConfig | null;
  allowSpecimenConfiguration?: boolean;
  specimenAcceptanceCriteria?: string[];
  specimenRejectionReasons?: string[];
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
  allowSpecimenConfiguration: { type: Boolean, default: false },
  specimenAcceptanceCriteria: { type: [String], default: ["Identity matches order", "Correct specimen type", "Correct container", "Sufficient quantity", "Collection and transport timing acceptable", "Specimen condition acceptable"] },
  specimenRejectionReasons: { type: [String], default: ["Incorrect identification", "Wrong container", "Insufficient quantity", "Leakage", "Unsuitable condition", "Compromised transport", "Other"] },
  transactionIdConfig: {
    type: {
      pattern: { type: String, required: true },
      reset: { type: String, enum: ['never', 'yearly', 'monthly', 'daily'], required: true },
      sequenceDigits: { type: Number, min: 1, max: 10, required: true },
    },
    default: undefined,
  },
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

const existingBranchModel = mongoose.models.Branch as mongoose.Model<IBranch> | undefined;
if (existingBranchModel && !existingBranchModel.schema.path('allowSpecimenConfiguration')) {
  existingBranchModel.schema.add({ allowSpecimenConfiguration: { type: Boolean, default: false } });
}
if (existingBranchModel && !existingBranchModel.schema.path('transactionIdConfig')) {
  existingBranchModel.schema.add({
    transactionIdConfig: {
      type: {
        pattern: { type: String, required: true },
        reset: { type: String, enum: ['never', 'yearly', 'monthly', 'daily'], required: true },
        sequenceDigits: { type: Number, min: 1, max: 10, required: true },
      },
      default: undefined,
    },
  });
}
if (existingBranchModel && !existingBranchModel.schema.path('specimenAcceptanceCriteria')) {
  existingBranchModel.schema.add({ specimenAcceptanceCriteria: { type: [String], default: ["Identity matches order", "Correct specimen type", "Correct container", "Sufficient quantity", "Collection and transport timing acceptable", "Specimen condition acceptable"] } });
}
if (existingBranchModel && !existingBranchModel.schema.path('specimenRejectionReasons')) {
  existingBranchModel.schema.add({ specimenRejectionReasons: { type: [String], default: ["Incorrect identification", "Wrong container", "Insufficient quantity", "Leakage", "Unsuitable condition", "Compromised transport", "Other"] } });
}

export default mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
