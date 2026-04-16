import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvoice extends Document {
  lab: Types.ObjectId;
  patient: Types.ObjectId;
  testOrderItems: Types.ObjectId[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  invoiceNumber: string;
  issuedAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  testOrderItems: [{ type: Schema.Types.ObjectId, ref: 'TestOrderItem', required: true }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  invoiceNumber: { type: String, required: true, unique: true },
  issuedAt: { type: Date, required: true },
  paidAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
