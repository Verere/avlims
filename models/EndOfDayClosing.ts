import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type EndOfDayStatus = "balanced" | "cash_over" | "cash_short";

export interface IEndOfDayClosing extends Document {
  branchId: Types.ObjectId;
  businessDate: Date;
  expectedCashAtHand: number;
  actualCashCounted: number;
  cashDifference: number;
  status: EndOfDayStatus;
  closedBy: Types.ObjectId;
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EndOfDayClosingSchema = new Schema<IEndOfDayClosing>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    businessDate: { type: Date, required: true, index: true },
    expectedCashAtHand: { type: Number, required: true },
    actualCashCounted: { type: Number, required: true, min: 0 },
    cashDifference: { type: Number, required: true },
    status: { type: String, enum: ["balanced", "cash_over", "cash_short"], required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    closedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

EndOfDayClosingSchema.index({ branchId: 1, businessDate: 1 }, { unique: true });

const EndOfDayClosing: Model<IEndOfDayClosing> = mongoose.models.EndOfDayClosing || mongoose.model<IEndOfDayClosing>("EndOfDayClosing", EndOfDayClosingSchema);
export default EndOfDayClosing;