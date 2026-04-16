import mongoose, { Schema, Document } from 'mongoose';

export interface ILab extends Document {
  name: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const LabSchema = new Schema<ILab>({
  name: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.Lab || mongoose.model<ILab>('Lab', LabSchema);
