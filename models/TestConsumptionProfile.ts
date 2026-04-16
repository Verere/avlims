import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITestConsumptionProfile extends Document {
  lab: Types.ObjectId;
  testType: string;
  inventory: Types.ObjectId;
  quantity: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestConsumptionProfileSchema = new Schema<ITestConsumptionProfile>({
  lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  testType: { type: String, required: true },
  inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
  quantity: { type: Number, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.TestConsumptionProfile || mongoose.model<ITestConsumptionProfile>('TestConsumptionProfile', TestConsumptionProfileSchema);
