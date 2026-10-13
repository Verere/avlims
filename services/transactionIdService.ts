import mongoose from 'mongoose';
import Branch from '@/models/Branch';
import Lab from '@/models/Lab';
import Order from '@/models/Order';
import OrderSequence from '@/models/OrderSequence';
import { dbConnect } from '@/lib/mongodb';
import {
  DEFAULT_TRANSACTION_ID_CONFIG,
  renderTransactionId,
  transactionIdPatternRegex,
  transactionIdPeriodKey,
  validateTransactionIdConfig,
} from '@/lib/transactionId';

function toAbbreviation(value: unknown) {
  const words = String(value || '')
    .trim()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  return words.map((word) => word[0]).join('').toUpperCase() || 'NA';
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);
}

function exactInsensitive(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

export async function generateTransactionId({
  labSlug,
  branchSlug,
  branchId,
  businessDate,
}: {
  labSlug: string;
  branchSlug: string;
  branchId?: string;
  businessDate?: string;
}) {
  await dbConnect();
  const lab = await Lab.findOne({ slug: exactInsensitive(labSlug) }).select('_id transactionIdConfig branches').lean();
  if (!lab) throw new Error('Lab not found for transaction ID');

  const branchQuery: Record<string, unknown> = { _id: { $in: lab.branches || [] } };
  if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
    if (!(lab.branches || []).some((id: unknown) => String(id) === branchId)) {
      throw new Error('Branch does not belong to lab for transaction ID');
    }
    branchQuery._id = branchId;
  } else {
    branchQuery.$or = [{ slug: exactInsensitive(branchSlug) }, { branch: exactInsensitive(branchSlug) }];
  }
  const branch = await Branch.findOne(branchQuery).select('_id branch slug transactionIdConfig').lean();
  if (!branch) throw new Error('Branch not found for transaction ID');

  const config = validateTransactionIdConfig(branch.transactionIdConfig)
    || validateTransactionIdConfig(lab.transactionIdConfig)
    || DEFAULT_TRANSACTION_ID_CONFIG;
  const date = businessDate ? new Date(businessDate) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error('Invalid business date for transaction ID');
  const values = {
    lab: toAbbreviation(labSlug),
    branch: toAbbreviation(branch.branch || branch.slug || branchSlug),
    date,
  };
  const periodKey = transactionIdPeriodKey(config.reset, date);
  const key = `${lab._id}:${branch._id}:${periodKey}`;
  const pattern = transactionIdPatternRegex(config, values);

  const matchingOrders = await Order.find({
    slug: labSlug,
    branch: branchSlug,
    transId: pattern,
  }).select('transId').lean();
  const highestExistingSequence = matchingOrders.reduce((highest, order) => {
    const match = String(order.transId || '').match(pattern);
    const sequence = Number(match?.[1] || 0);
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  try {
    await OrderSequence.updateOne(
      { key },
      { $setOnInsert: { sequence: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }
  await OrderSequence.updateOne({ key }, { $max: { sequence: highestExistingSequence } });

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const counter = await OrderSequence.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { new: true }
    ).select('sequence').lean();
    if (!counter) throw new Error('Failed to allocate transaction ID sequence');

    const transactionId = renderTransactionId(config, { ...values, sequence: counter.sequence });
    if (!(await Order.exists({ transId: transactionId }))) return transactionId;
  }

  throw new Error('Unable to allocate a unique transaction ID; review the configured pattern');
}
