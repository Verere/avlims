import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrder extends Document {
  patientId: string;
  gender?: string;
  name: string;
  tests: any[];
  transId?: string;
  registrationKey?: string;
  registrationFingerprint?: string;
  amount: number;
  /** Listed price before discount. `amount` remains the legacy subtotal field. */
  subtotal?: number;
  /** Customer charge after discount; bonus is tracked separately as an expense. */
  amountDue?: number;
  /** Immutable checkout-time payment and credit snapshots. */
  checkoutPaid?: number;
  checkoutCredit?: number;
  amountPaid: number;
  bal: number;
  clinic: string;
  clinicId?: string;
  referral?: string;
  referralId?: string;
  billTo?: string;
  billToName?: string;
  billToRef?: string;
  user: string;
  status?: string;
  priority?: string;
  slug?: string;
  bDate?: string;
  isCancelled?: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  branch?: string;
  branchId?: string;
  revenue?: number;
  bonus?: number;
  discount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderSchema: Schema<IOrder> = new mongoose.Schema({
  patientId:{type: String},
  gender: { type: String },
  name:{type: String},
  tests: [mongoose.Schema.Types.Mixed],
  transId: { type: String, unique: true, sparse: true },
  registrationKey: { type: String, unique: true, sparse: true },
  registrationFingerprint: { type: String },
  amount: {type: Number}, 
  subtotal: { type: Number },
  amountDue: { type: Number },
  checkoutPaid: { type: Number, min: 0 },
  checkoutCredit: { type: Number, min: 0 },
  amountPaid: {type: Number, default:0}, 
  bal: {type: Number},  
  clinic:{type: String},
  clinicId:{type: String},       
  referral:{type: String},        
  referralId:{type: String},
  billTo:{type: String},
  billToName: { type: String },
  billToRef: { type: String },
  user:{type: String,   required: true},
  status:{type: String},
  priority: { type: String, default: 'Routine' },
  slug:{type: String},
  bDate: {
    type: String,
  },
  isCancelled:{type:Boolean, default:false},
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  branch: { type: String },
  branchId: { type: String },
  revenue: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
}, {
  timestamps: true
});

const existingOrderModel = mongoose.models.Order as Model<IOrder> | undefined;
if (existingOrderModel && !existingOrderModel.schema.path('priority')) {
  existingOrderModel.schema.add({ priority: { type: String, default: 'Routine' } });
}

const Order: Model<IOrder> = existingOrderModel || mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
