import mongoose, { Schema, Types } from "mongoose";

export type SpecimenStatus = "Pending Collection" | "Collection In Progress" | "Collected" | "In Transit" | "Received in Lab" | "Partially Accepted" | "Processing" | "Accepted" | "Rejected" | "Collection Failed" | "Cancelled" | "Collection Not Required";

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

const OrderedTestLinkSchema = new Schema({
  orderTestId: { type: String, required: true },
  catalogueTestId: { type: String, required: true },
  testName: { type: String, required: true },
  category: { type: String, default: "" },
  requiredSpecimenType: { type: String, default: "" },
  requiredContainerType: { type: String, default: "" },
  collectionMethod: { type: String, default: "" },
  collectionInstructions: { type: String, default: "" },
  collectionPriority: { type: String, default: "routine" },
  acceptanceStatus: { type: String, enum: ["Pending Review", "Accepted", "Rejected"], default: "Pending Review" },
  acceptanceReason: { type: String, default: "" },
  rejectionReason: { type: String, default: "" },
  recollectionRequired: { type: Boolean, default: false },
  assessedAt: Date,
  assessedBy: String,
  routedAt: Date,
}, { _id: false });

const SpecimenSchema = new Schema({
  sampleId: { type: String, required: true }, accessionNumber: { type: String, trim: true }, labId: { type: Schema.Types.ObjectId, ref: "Lab", required: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true }, labSlug: { type: String, required: true }, branchSlug: { type: String, required: true },
  patientId: { type: String, required: true }, patientName: { type: String, required: true }, orderId: { type: String, required: true }, orderedTestIds: { type: [String], default: [] }, orderTestId: { type: String }, collectionTaskKey: { type: String }, orderedTests: { type: [OrderedTestLinkSchema], default: [] }, collectionGroupId: { type: String }, physicalSpecimenId: { type: String }, recollectionForSpecimenId: { type: String }, recollectionTaskId: { type: String }, recollectionRequired: { type: Boolean, default: false }, orderNumber: { type: String, required: true },
  tests: { type: [String], default: [] }, department: String, category: String, priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine" },
  specimenType: { type: String, required: true }, container: String, collectionMethod: String, collectionSite: String, containers: { type: Number, min: 1, default: 1 }, volume: String,
  registeredAt: Date, collectionAt: Date, collectedBy: String, collectionNotes: String, collectionDeadline: Date, collectorName: String, location: String, condition: { type: String, default: "Acceptable" }, handling: String, collectionInstructions: String,
  checks: { type: Map, of: Boolean, default: {} }, acceptance: { type: String, enum: ["Pending Review", "Accepted", "Rejected"], default: "Pending Review" }, rejectionReason: String, comments: String,
  receivedAt: Date, receivingStaff: String, rejectedAt: Date, collectionFailedAt: Date, collectionFailedReason: String, cancelledAt: Date, transport: String, temperature: String, status: { type: String, enum: ["Pending Collection", "Collection In Progress", "Collected", "In Transit", "Received in Lab", "Partially Accepted", "Processing", "Accepted", "Rejected", "Collection Failed", "Cancelled", "Collection Not Required"], default: "Pending Collection" },
  history: { type: [HistorySchema], default: [] }, createdBy: { type: Schema.Types.ObjectId, required: true }, updatedBy: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });

SpecimenSchema.index({ sampleId: 1 }, { unique: true });
SpecimenSchema.index({ accessionNumber: 1 }, { unique: true, sparse: true });
SpecimenSchema.index({ labId: 1, branchId: 1, createdAt: -1 });
SpecimenSchema.index({ labId: 1, branchId: 1, registeredAt: -1 });
SpecimenSchema.index({ orderId: 1, collectionTaskKey: 1 }, { unique: true, partialFilterExpression: { collectionTaskKey: { $type: "string" } } });
SpecimenSchema.index({ recollectionForSpecimenId: 1 }, { unique: true, partialFilterExpression: { recollectionForSpecimenId: { $type: "string" } } });
SpecimenSchema.index({ labId: 1, branchId: 1, collectionGroupId: 1 });
SpecimenSchema.index({ labId: 1, branchId: 1, physicalSpecimenId: 1 });

const existingSpecimenModel = mongoose.models.Specimen as mongoose.Model<any> | undefined;
if (existingSpecimenModel) {
  const missingPaths = Object.fromEntries(
    Object.entries(SpecimenSchema.obj).filter(([path]) => !existingSpecimenModel.schema.path(path))
  );
  if (Object.keys(missingPaths).length) existingSpecimenModel.schema.add(missingPaths);

  const existingOrderedTests = existingSpecimenModel.schema.path("orderedTests") as any;
  if (existingOrderedTests?.schema) {
    const missingOrderedTestPaths = Object.fromEntries(
      Object.entries(OrderedTestLinkSchema.obj).filter(([path]) => !existingOrderedTests.schema.path(path))
    );
    if (Object.keys(missingOrderedTestPaths).length) existingOrderedTests.schema.add(missingOrderedTestPaths);
  }

  const statusPath = existingSpecimenModel.schema.path("status") as any;
  if (statusPath?.enumValues) {
    for (const status of (SpecimenSchema.path("status") as any).enumValues || []) {
      if (!statusPath.enumValues.includes(status)) statusPath.enumValues.push(status);
    }
  }
  const existingIndexes = existingSpecimenModel.schema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>;
  if (!existingIndexes.some(([keys]) => Object.prototype.hasOwnProperty.call(keys, "accessionNumber"))) {
    existingSpecimenModel.schema.index({ accessionNumber: 1 }, { unique: true, sparse: true });
  }
}

export default existingSpecimenModel || mongoose.model("Specimen", SpecimenSchema);
