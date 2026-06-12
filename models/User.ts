import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password: string;
  status: 'active' | 'inactive';
  emailToken?: string;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  invitedLabId?: Types.ObjectId;
  invitedBranchId?: Types.ObjectId;
  invitedLabSlug?: string;
  invitedBranchName?: string;
  invitedLabName?: string;
  invitedRole?: string;
  invitedPermissions?: string[];
  invitedBy?: Types.ObjectId;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  emailToken: { type: String },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },
  invitedLabId: { type: Schema.Types.ObjectId, ref: 'Lab' },
  invitedBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  invitedLabSlug: { type: String },
  invitedBranchName: { type: String },
  invitedLabName: { type: String },
  invitedRole: { type: String },
  invitedPermissions: [{ type: String }],
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  avatar: { type: String },
}, { timestamps: true });

UserSchema.pre('validate', function (this: IUser) {
  const user = this as any;
  if (!user.username || typeof user.username !== 'string' || !user.username.trim()) {
    const emailPrefix = String(user.email || 'user')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase() || 'user';
    const suffix = Math.random().toString(36).slice(2, 8);
    user.username = `${emailPrefix}_${suffix}`;
  }
});

const existingModel = mongoose.models.User as mongoose.Model<IUser> | undefined;
if (existingModel) {
  // Patch cached model schema during dev/hot-reload so username is not dropped.
  if (!existingModel.schema.path('username')) {
    existingModel.schema.add({ username: { type: String, unique: true, sparse: true } });
  }

  if (!(existingModel.schema as any)._usernamePreValidatePatched) {
    existingModel.schema.pre('validate', function (this: IUser) {
      const user = this as any;
      if (!user.username || typeof user.username !== 'string' || !user.username.trim()) {
        const emailPrefix = String(user.email || 'user')
          .split('@')[0]
          .replace(/[^a-zA-Z0-9._-]/g, '')
          .toLowerCase() || 'user';
        const suffix = Math.random().toString(36).slice(2, 8);
        user.username = `${emailPrefix}_${suffix}`;
      }
    });
    (existingModel.schema as any)._usernamePreValidatePatched = true;
  }
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
