import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILabMembership extends Document {
  labId: Types.ObjectId;
  branchId: Types.ObjectId;
  lab: string;
  slug: string;
  branch?: string;
  name: string;
  permissions: string[];
  status: 'active' | 'inactive';
  role: string;
  user: Types.ObjectId;
  owner?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}


const LabMembershipSchema = new Schema<ILabMembership>({
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  lab: { type: String },
  slug: { type: String },
  branch: { type: String },
  name: { type: String, required: true },
  permissions: [{ type: String, required: true }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  role: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User' , required: true },
}, { timestamps: true });

// Ensure a user can only have one membership per lab+branch
LabMembershipSchema.index({ user: 1, lab: 1, branch: 1 }, { unique: true });

export default mongoose.models.LabMembership || mongoose.model<ILabMembership>('LabMembership', LabMembershipSchema);
