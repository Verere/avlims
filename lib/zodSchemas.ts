import { z } from 'zod';
import mongoose from 'mongoose';

// Custom validator for ObjectId
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const testOrderCreationSchema = z.object({
  lab: objectIdSchema,
  patient: objectIdSchema,
  testType: z.string().min(1, 'Test type is required'),
  orderedBy: objectIdSchema,
  price: z.number().min(0, 'Price must be non-negative'),
  referredBy: objectIdSchema.optional(),
});

export const patientRegistrationSchema = z.object({
  lab: objectIdSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth',
  }),
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
  contact: z.string().min(1, 'Contact is required'),
});

export const inventoryAdjustmentSchema = z.object({
  lab: objectIdSchema,
  item: objectIdSchema,
  quantity: z.number().int('Quantity must be an integer'),
  reason: z.string().min(1, 'Reason is required'),
  adjustedBy: objectIdSchema,
});
