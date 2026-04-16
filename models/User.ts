import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  lab: Types.ObjectId;
  role: Types.ObjectId;
  email: string;
  name: string;
  password: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
