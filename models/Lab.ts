import mongoose, { Schema, Document } from 'mongoose';
import type { TransactionIdConfig } from '@/lib/transactionId';



export interface ILab extends Document {
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  branches?: mongoose.Types.ObjectId[];
  transactionIdConfig?: TransactionIdConfig;
  createdAt: Date;
  updatedAt: Date;
}



const LabSchema = new Schema<ILab>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  transactionIdConfig: {
    pattern: { type: String },
    reset: { type: String, enum: ['never', 'yearly', 'monthly', 'daily'] },
    sequenceDigits: { type: Number, min: 1, max: 10 },
  },
  branches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
}, { timestamps: true });

const existingLabModel = mongoose.models.Lab as mongoose.Model<ILab> | undefined;
if (existingLabModel && !existingLabModel.schema.path('transactionIdConfig')) {
  existingLabModel.schema.add({
    transactionIdConfig: {
      pattern: { type: String },
      reset: { type: String, enum: ['never', 'yearly', 'monthly', 'daily'] },
      sequenceDigits: { type: Number, min: 1, max: 10 },
    },
  });
}

export default mongoose.models.Lab || mongoose.model<ILab>('Lab', LabSchema);
