import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInventoryLedger extends Document {
  lab: Types.ObjectId;
  inventory: Types.ObjectId;
  action: 'add' | 'remove' | 'adjust';
  quantity: number;
  user: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLedgerSchema = new Schema<IInventoryLedger>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
  action: { type: String, enum: ['add', 'remove', 'adjust'], required: true },
  quantity: { type: Number, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String },
}, { timestamps: true });

export default mongoose.models.InventoryLedger || mongoose.model<IInventoryLedger>('InventoryLedger', InventoryLedgerSchema);
