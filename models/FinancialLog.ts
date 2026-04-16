import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFinancialLog extends Document {
  lab: Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  relatedModel?: string;
  relatedId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLogSchema = new Schema<IFinancialLog>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  relatedModel: { type: String },
  relatedId: { type: Schema.Types.ObjectId },
}, { timestamps: true });

export default mongoose.models.FinancialLog || mongoose.model<IFinancialLog>('FinancialLog', FinancialLogSchema);
