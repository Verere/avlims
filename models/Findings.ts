import mongoose, { Schema, Document, Types } from 'mongoose';

export type FindingSection = 'findings' | 'impression' | 'conclusion' | 'other';

export interface IFinding extends Document {
  title: string;
  content: string;
  section: FindingSection;
  modality?: string;

  reportTemplateRef?: Types.ObjectId;
  testRef?: Types.ObjectId;

  slug: string;
  branchId: Types.ObjectId;
  isActive: boolean;
  isCancelled: boolean;
}

const FindingsSchema = new Schema<IFinding>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    section: {
      type: String,
      enum: ['findings', 'impression', 'conclusion', 'other'],
      default: 'findings',
      required: true,
    },
    modality: { type: String },

    reportTemplateRef: { type: Schema.Types.ObjectId, ref: 'ScanReportTemplate' },
    testRef: { type: Schema.Types.ObjectId, ref: 'Test' },

    slug: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    isActive: { type: Boolean, default: true },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// FindingsSchema.pre('validate', function (next) {
//   const doc = this as IFinding;
//   if (!doc.reportTemplateRef && !doc.testRef) {
//     return next(new Error('A finding snippet must be linked to either reportTemplateRef or testRef'));
//   }
//   next();
// });

export default mongoose.models.Finding || mongoose.model<IFinding>('Finding', FindingsSchema);
