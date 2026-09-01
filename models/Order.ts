import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrder extends Document {
  patientId: string;
  name: string;
  tests: any[];
  transId?: string;
  amount: number;
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
  slug?: string;
  bDate?: string;
  isCancelled?: boolean;
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
  name:{type: String},
  tests: [mongoose.Schema.Types.Mixed],
  transId: { type: String, unique: true, sparse: true },
  amount: {type: Number}, 
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
  slug:{type: String},
  bDate: {
    type: String,
  },
  isCancelled:{type:Boolean, default:false},
  branch: { type: String },
  branchId: { type: String },
  revenue: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
}, {
  timestamps: true
});

if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
