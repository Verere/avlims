import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRole extends Document {
  lab: Types.ObjectId;
  name: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  name: { type: String, required: true },
  permissions: [{ type: String, required: true }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
