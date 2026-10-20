import mongoose, { Schema, Types } from "mongoose";

export type SpecimenStatus = "Pending Collection" | "Collected" | "In Transit" | "Received in Lab" | "Processing" | "Accepted" | "Rejected" | "Cancelled";

export interface ISpecimenHistory {
  status: SpecimenStatus;
  at: Date;
  userId: Types.ObjectId;
  userName: string;
  note?: string;
}

const HistorySchema = new Schema<ISpecimenHistory>({
  status: { type: String, required: true }, at: { type: Date, required: true },
  userId: { type: Schema.Types.ObjectId, required: true }, userName: { type: String, required: true }, note: String,
}, { _id: false });

const SpecimenSchema = new Schema({
  sampleId: { type: String, required: true }, labId: { type: Schema.Types.ObjectId, ref: "Lab", required: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true }, labSlug: { type: String, required: true }, branchSlug: { type: String, required: true },
  patientId: { type: String, required: true }, patientName: { type: String, required: true }, orderId: { type: String, required: true }, orderNumber: { type: String, required: true },
  tests: { type: [String], default: [] }, department: String, priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine" },
  specimenType: { type: String, required: true }, container: String, collectionMethod: String, collectionSite: String, containers: { type: Number, min: 1, default: 1 }, volume: String,
  collectionAt: Date, collectorName: String, location: String, condition: { type: String, default: "Acceptable" }, handling: String,
  checks: { type: Map, of: Boolean, default: {} }, acceptance: { type: String, enum: ["Pending Review", "Accepted", "Rejected"], default: "Pending Review" }, rejectionReason: String, comments: String,
  receivedAt: Date, receivingStaff: String, transport: String, temperature: String, status: { type: String, enum: ["Pending Collection", "Collected", "In Transit", "Received in Lab", "Processing", "Accepted", "Rejected", "Cancelled"], default: "Pending Collection" },
  history: { type: [HistorySchema], default: [] }, createdBy: { type: Schema.Types.ObjectId, required: true }, updatedBy: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });

SpecimenSchema.index({ sampleId: 1 }, { unique: true });
SpecimenSchema.index({ labId: 1, branchId: 1, createdAt: -1 });

export default mongoose.models.Specimen || mongoose.model("Specimen", SpecimenSchema);
