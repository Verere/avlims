import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderSequence extends Document {
  key: string;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSequenceSchema = new Schema<IOrderSequence>({
  key: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true, min: 0 },
}, { timestamps: true });

export default mongoose.models.OrderSequence || mongoose.model<IOrderSequence>('OrderSequence', OrderSequenceSchema);
