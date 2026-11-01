import mongoose, { Schema } from "mongoose";

const WorklistHistorySchema = new Schema({
  action: { type: String, required: true },
  fromStatus: { type: String, default: "" },
  toStatus: { type: String, required: true },
  reason: { type: String, default: "" },
  staffId: { type: Schema.Types.ObjectId, ref: "User" },
  staffName: { type: String, required: true },
  at: { type: Date, required: true },
}, { _id: false });

const CategoryWorklistItemSchema = new Schema({
  labId: { type: Schema.Types.ObjectId, ref: "Lab", required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
  category: { type: String, required: true, index: true },
  orderId: { type: String, required: true },
  orderNumber: { type: String, required: true, index: true },
  orderPriority: { type: String, default: "Routine", index: true },
  orderTestId: { type: String, required: true },
  catalogueTestId: { type: String, required: true, index: true },
  testName: { type: String, required: true, index: true },
  testType: { type: String, default: "lab" },
  patientId: { type: String, required: true, index: true },
  patientName: { type: String, required: true, index: true },
  patientGender: { type: String, default: "" },
  orderDate: { type: Date, required: true, index: true },
  priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine", index: true },
  requiresSpecimen: { type: Boolean, default: false, index: true },
  eligibleForProcessing: { type: Boolean, default: false, index: true },
  eligibilityReason: { type: String, default: "" },
  specimenId: { type: Schema.Types.ObjectId, ref: "Specimen" },
  sampleId: { type: String, default: "" },
  physicalSpecimenId: { type: String, default: "" },
  accessionNumber: { type: String, default: "", index: true },
  specimenType: { type: String, default: "" },
  specimenStatus: { type: String, default: "" },
  specimenAcceptedAt: Date,
  turnaroundHours: { type: Number, min: 0 },
  dueAt: Date,
  status: { type: String, enum: ["Awaiting Specimen", "Awaiting Processing", "Assigned", "In Progress", "Awaiting Result Entry", "On Hold", "Completed", "Cancelled"], default: "Awaiting Processing", index: true },
  statusBeforeHold: { type: String, default: "" },
  assignedStaffId: { type: Schema.Types.ObjectId, ref: "User" },
  assignedStaffName: { type: String, default: "" },
  assignedAt: Date,
  processingStartedAt: Date,
  resultEnteredAt: Date,
  completedAt: Date,
  result: { type: Schema.Types.Mixed, default: {} },
  resultTemplate: { type: Schema.Types.Mixed },
  resultUpdatedAt: Date,
  resultUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  holdReason: { type: String, default: "" },
  history: { type: [WorklistHistorySchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

CategoryWorklistItemSchema.index({ orderId: 1, orderTestId: 1 }, { unique: true });
CategoryWorklistItemSchema.index({ labId: 1, branchId: 1, categoryId: 1, status: 1, orderDate: -1 });
CategoryWorklistItemSchema.index({ labId: 1, branchId: 1, dueAt: 1, status: 1 });

const existingWorklistModel = mongoose.models.CategoryWorklistItem as mongoose.Model<any> | undefined;
if (existingWorklistModel && !existingWorklistModel.schema.path("physicalSpecimenId")) {
  existingWorklistModel.schema.add({ physicalSpecimenId: { type: String, default: "" } });
}
if (existingWorklistModel && !existingWorklistModel.schema.path("orderPriority")) {
  existingWorklistModel.schema.add({ orderPriority: { type: String, default: "Routine", index: true } });
}

export default existingWorklistModel || mongoose.model("CategoryWorklistItem", CategoryWorklistItemSchema);
