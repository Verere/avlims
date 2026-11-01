import mongoose, { Schema } from "mongoose";

const SpecimenRoutingEventSchema = new Schema({
  labId: { type: Schema.Types.ObjectId, ref: "Lab", required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  specimenId: { type: Schema.Types.ObjectId, ref: "Specimen", required: true },
  sampleId: { type: String, required: true },
  accessionNumber: { type: String, required: true },
  orderId: { type: String, required: true },
  orderNumber: { type: String, required: true },
  patientId: { type: String, required: true },
  orderTestId: { type: String, required: true },
  catalogueTestId: { type: String, default: "" },
  testName: { type: String, required: true },
  department: { type: String, default: "" },
  priority: { type: String, default: "Routine" },
  status: { type: String, enum: ["eligible", "queued"], default: "eligible" },
  acceptedAt: { type: Date, required: true },
  acceptedBy: { type: String, required: true },
}, { timestamps: true });

SpecimenRoutingEventSchema.index({ specimenId: 1, orderTestId: 1 }, { unique: true });
SpecimenRoutingEventSchema.index({ labId: 1, branchId: 1, status: 1, department: 1, createdAt: 1 });

export default mongoose.models.SpecimenRoutingEvent || mongoose.model("SpecimenRoutingEvent", SpecimenRoutingEventSchema);
