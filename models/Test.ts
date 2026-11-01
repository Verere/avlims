import mongoose, { Schema, Document } from 'mongoose';

export type TestType = 'lab' | 'scan';
export type ResultType = 'numeric' | 'qualitative' | 'enumerated' | 'text';
export type SampleType = 'blood' | 'urine' | 'stool' | 'serum' | 'swab' | 'csf' | 'sputum' | 'other';
export type SpecimenType = 'blood' | 'serum' | 'plasma' | 'urine' | 'stool' | 'sputum' | 'swab' | 'tissue' | 'semen' | 'other';
export type CollectionPriority = 'routine' | 'urgent' | 'stat' | 'other';
export type CollectionConfigStatus = 'needs_review' | 'configured';
export type AgeGroup = 'pediatric' | 'adult' | 'all';

export interface IReferenceRange {
  gender?: 'male' | 'female' | 'all';
  ageGroup?: AgeGroup;
  ageMinYears?: number;
  ageMaxYears?: number;
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit?: string;
  label?: string;
}

export interface ITest extends Document {
  name: string;
  code?: string;
  category: string;
  subCategory?: string;
  slug: string;
  branchId: mongoose.Types.ObjectId;
  price: number;

  // Classification
  type: TestType;
  resultType: ResultType;
  sampleType?: SampleType;

  // Specimen collection configuration. Legacy tests stay marked for review.
  requires_specimen_collection: boolean;
  specimen_type?: SpecimenType;
  container_type?: string;
  collection_method?: string;
  collection_instructions?: string;
  collection_priority?: CollectionPriority;
  collection_config_status: CollectionConfigStatus;

  // Logistics
  unit?: string;
  turnaroundHours?: number;
  preparationInstructions?: string;

  // Scan-specific
  reportTemplateRef?: mongoose.Types.ObjectId;

  // Lab-specific reference ranges (embedded)
  referenceRanges?: IReferenceRange[];

  // Status
  isActive: boolean;
  isCancelled?: boolean;
}

const ReferenceRangeSchema = new Schema<IReferenceRange>(
  {
    gender: { type: String, enum: ['male', 'female', 'all'], default: 'all' },
    ageGroup: { type: String, enum: ['pediatric', 'adult', 'all'], default: 'all' },
    ageMinYears: { type: Number },
    ageMaxYears: { type: Number },
    low: { type: Number },
    high: { type: Number },
    criticalLow: { type: Number },
    criticalHigh: { type: Number },
    unit: { type: String },
    label: { type: String },
  },
  { _id: false }
);

const TestSchema = new Schema<ITest>(
  {
    name: { type: String, required: true },
    code: { type: String },
    category: { type: String, required: true },
    subCategory: { type: String },
    slug: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    price: { type: Number, required: true },

    type: { type: String, enum: ['lab', 'scan'], required: true, default: 'lab' },
    resultType: {
      type: String,
      enum: ['numeric', 'qualitative', 'enumerated', 'text'],
      required: true,
      default: 'numeric',
    },
    sampleType: {
      type: String,
      enum: ['blood', 'urine', 'stool', 'serum', 'swab', 'csf', 'sputum', 'other'],
    },
    requires_specimen_collection: { type: Boolean, default: false },
    specimen_type: { type: String, trim: true },
    container_type: { type: String, trim: true },
    collection_method: { type: String, trim: true },
    collection_instructions: { type: String, trim: true },
    collection_priority: { type: String, enum: ['routine', 'urgent', 'stat', 'other'], default: 'routine' },
    collection_config_status: { type: String, enum: ['needs_review', 'configured'], default: 'needs_review', index: true },

    unit: { type: String },
    turnaroundHours: { type: Number },
    preparationInstructions: { type: String },

    reportTemplateRef: { type: Schema.Types.ObjectId, ref: 'ScanReportTemplate' },

    referenceRanges: { type: [ReferenceRangeSchema], default: [] },

    isActive: { type: Boolean, default: true },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Test || mongoose.model<ITest>('Test', TestSchema);
