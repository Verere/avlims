import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInventory extends Document {
  lab: Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  threshold: number;
  updatedAt: Date;
  createdAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  threshold: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
