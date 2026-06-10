import mongoose, { Schema, Document, Types } from 'mongoose';

export type ScanModality =
  | 'xray'
  | 'ultrasound'
  | 'ct'
  | 'mri'
  | 'mammography'
  | 'ecg'
  | 'echo'
  | 'other';

export interface ITemplateSection {
  key: string;
  title: string;
  defaultText?: string;
  required?: boolean;
  order?: number;
}

export interface IScanReportTemplate extends Document {
  title: string;
  modality: ScanModality;

  findingsDefaultText?: string;
  impressionDefaultText?: string;
  conclusionDefaultText?: string;

  sections: ITemplateSection[];

  description?: string;
  slug: string;
  branchId: Types.ObjectId;
  testRefs?: Types.ObjectId[];

  isActive: boolean;
  isCancelled: boolean;
}

const TemplateSectionSchema = new Schema<ITemplateSection>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    defaultText: { type: String },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const ScanReportTemplateSchema = new Schema<IScanReportTemplate>(
  {
    title: { type: String, required: true },
    modality: {
      type: String,
      enum: ['xray', 'ultrasound', 'ct', 'mri', 'mammography', 'ecg', 'echo', 'other'],
      required: true,
      default: 'xray',
    },

    findingsDefaultText: { type: String, default: '' },
    impressionDefaultText: { type: String, default: '' },
    conclusionDefaultText: { type: String, default: '' },

    sections: { type: [TemplateSectionSchema], default: [] },

    description: { type: String },
    slug: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    testRefs: [{ type: Schema.Types.ObjectId, ref: 'Test' }],

    isActive: { type: Boolean, default: true },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.ScanReportTemplate ||
  mongoose.model<IScanReportTemplate>('ScanReportTemplate', ScanReportTemplateSchema);
