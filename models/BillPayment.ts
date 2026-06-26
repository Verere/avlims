import mongoose, { Schema, Document, Types } from 'mongoose';

export type BillPaymentMethod = 'cash' | 'transfer' | 'pos' | 'other';
export type BillPaymentStatus = 'posted' | 'reversed';

export interface IBillPaymentLine {
  method: BillPaymentMethod;
  amount: number;
  reference?: string;
}

export interface IBillPayment extends Document {
  billId: Types.ObjectId;
  orderId?: Types.ObjectId;
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  patient: string;
  referrer?: string;
  billTo: 'Patient' | 'RefClinic' | 'Referrer';
  billToName?: string;
  billToRef?: string;
  amount: number;
  lines: IBillPaymentLine[];
  status: BillPaymentStatus;
  businessDate: Date;
  userId?: Types.ObjectId;
  user: string;
  note?: string;
  isCancelled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BillPaymentLineSchema = new Schema<IBillPaymentLine>(
  {
    method: {
      type: String,
      enum: ['cash', 'transfer', 'pos', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String },
  },
  { _id: false }
);

const BillPaymentSchema = new Schema<IBillPayment>(
  {
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patient: { type: String, required: true },
    referrer: { type: String, default: '' },
    billTo: { type: String, enum: ['Patient', 'RefClinic', 'Referrer'], required: true },
    billToName: { type: String },
    billToRef: { type: String },
    amount: { type: Number, required: true, min: 0 },
    lines: { type: [BillPaymentLineSchema], required: true, validate: [(v: IBillPaymentLine[]) => v.length > 0, 'At least one payment line is required'] },
    status: { type: String, enum: ['posted', 'reversed'], default: 'posted' },
    businessDate: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    user: { type: String, required: true },
    note: { type: String },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

function applyNotCancelledFilter(this: any) {
  const query = this.getQuery() as Record<string, unknown>;
  if (query.isCancelled === undefined) {
    this.where({ isCancelled: { $ne: true } });
  }
}

BillPaymentSchema.pre("find", applyNotCancelledFilter);
BillPaymentSchema.pre("findOne", applyNotCancelledFilter);

export default mongoose.models.BillPayment || mongoose.model<IBillPayment>('BillPayment', BillPaymentSchema);
