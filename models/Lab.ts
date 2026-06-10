import mongoose, { Schema, Document } from 'mongoose';



export interface ILab extends Document {
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  branches?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}



const LabSchema = new Schema<ILab>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  branches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
}, { timestamps: true });

export default mongoose.models.Lab || mongoose.model<ILab>('Lab', LabSchema);
