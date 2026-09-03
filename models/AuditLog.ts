import mongoose, { Document, Schema, Types } from "mongoose";

export type AuditAction = "create" | "update" | "delete" | "status_change" | "login" | "logout";

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorId?: Types.ObjectId;
  actorName?: string;
  actorEmail?: string;
  labId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestMethod?: string;
  requestPath?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: ["create", "update", "delete", "status_change", "login", "logout"],
      required: true,
    },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorName: { type: String, trim: true },
    actorEmail: { type: String, trim: true, lowercase: true },
    labId: { type: Schema.Types.ObjectId, ref: "Lab", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    requestMethod: { type: String, trim: true },
    requestPath: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ labId: 1, branchId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);