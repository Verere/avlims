import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IExpense extends Document {
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'pos' | 'other';
  description: string;
  category?: string;
  businessDate: Date;
  user?: string;
  note?: string;
  isCancelled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'transfer', 'pos', 'other'], default: 'cash' },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: 'general' },
    businessDate: { type: Date, required: true },
    user: { type: String },
    note: { type: String },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (mongoose.models.Expense) {
  delete mongoose.models.Expense;
}

const Expense: Model<IExpense> = mongoose.model<IExpense>('Expense', ExpenseSchema);
export default Expense;
