import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  regNumber: string;
  age?: number;
  address?: string;
  gender?: string;
  number?: number;
  email?: string;
  slug?: string;
  isCancelled?: boolean;
  labId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatientSchema: Schema<IPatient> = new mongoose.Schema({
  name: { type: String, required: true },
  regNumber: { type: String, required: true },
  age: { type: Number },
  address: { type: String },
  gender: { type: String },
  number: { type: Number },
  email: { type: String },
  slug: { type: String },
  isCancelled: { type: Boolean, default: false },
  labId: { type: mongoose.Types.ObjectId, ref: 'lab' },
}, {
  timestamps: true,
});

const Patient: Model<IPatient> = mongoose.models.patient || mongoose.model<IPatient>('patient', PatientSchema);
export default Patient;
