import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CashMovementType = "cash_to_bank" | "bank_to_cash";

export interface ICashMovement extends Document {
  branchId: Types.ObjectId;
  businessDate: Date;
  type: CashMovementType;
  amount: number;
  bankName?: string;
  reference?: string;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CashMovementSchema = new Schema<ICashMovement>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    businessDate: { type: Date, required: true, index: true },
    type: { type: String, enum: ["cash_to_bank", "bank_to_cash"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    bankName: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

CashMovementSchema.index({ branchId: 1, businessDate: -1, createdAt: -1 });

const CashMovement: Model<ICashMovement> = mongoose.models.CashMovement || mongoose.model<ICashMovement>("CashMovement", CashMovementSchema);
export default CashMovement;