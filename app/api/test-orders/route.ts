import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Order from '../../../models/Order';
import { writeAuditLog } from '@/lib/audit';
import { generateTransactionId } from '@/services/transactionIdService';
import Test from '@/models/Test';
import Specimen from '@/models/Specimen';
import Lab from '@/models/Lab';
import Branch from '@/models/Branch';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import LabMembership from '@/models/LabMembership';
import AuditLog from '@/models/AuditLog';
import Category from '@/models/Category';
import CategoryWorklistItem from '@/models/CategoryWorklistItem';
import { createHash } from 'crypto';

function exactInsensitive(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function registrationFingerprintFor(body: any) {
  const normalized = {
    patientId: body?.patientId, slug: body?.slug, branch: body?.branch, branchId: body?.branchId,
    billTo: body?.billTo, status: body?.status, amount: body?.amount,
    tests: (Array.isArray(body?.tests) ? body.tests : []).map((test: any) => [test?.id, test?.quantity, test?.price]),
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export async function POST(req: NextRequest) {
  await dbConnect();
  let requestRegistrationKey = '';
  let requestFingerprint = '';
  let requestUserId = '';
  let requestLab: any = null;
  let requestBranch: any = null;
  try {
    const session = await getServerSession(authOptions);
    const userId = String(session?.user?.id || '');
    requestUserId = userId;
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const labSlug = String(body?.slug || "").trim();
    const branchSlug = String(body?.branch || "").trim();
    if (!labSlug || !branchSlug) {
      return NextResponse.json({ error: "slug and branch are required" }, { status: 400 });
    }

    const lab = await Lab.findOne({ slug: labSlug }).select('_id owner branches').lean();
    const branchPattern = exactInsensitive(branchSlug);
    const branch = body?.branchId && mongoose.Types.ObjectId.isValid(String(body.branchId))
      ? await Branch.findById(String(body.branchId)).select('_id slug branch').lean()
      : await Branch.findOne({ $or: [{ slug: branchPattern }, { branch: branchPattern }] }).select('_id slug branch').lean();
    requestLab = lab;
    requestBranch = branch;
    const normalizedBranchIdentifier = branchSlug.trim().toLocaleLowerCase();
    const branchIdentifierMatches = branch && [branch.slug, branch.branch].some((value) => String(value || '').trim().toLocaleLowerCase() === normalizedBranchIdentifier);
    if (!lab || !branch || !lab.branches?.some((id: any) => String(id) === String(branch._id)) || !branchIdentifierMatches) {
      return NextResponse.json({ error: 'Lab and branch do not match' }, { status: 404 });
    }
    const isOwner = String(lab.owner) === userId;
    const membership = isOwner ? null : await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: 'active' }).select('_id').lean();
    if (!isOwner && !membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const registrationKey = String(body?.registrationKey || '').trim();
    if (registrationKey.length < 8 || registrationKey.length > 200) return NextResponse.json({ error: 'A valid registration idempotency key is required' }, { status: 400 });
    const registrationFingerprint = registrationFingerprintFor(body);
    requestFingerprint = registrationFingerprint;
    requestRegistrationKey = registrationKey;
    if (registrationKey) {
      const existing = await Order.findOne({ registrationKey });
      if (existing) {
        if (String(existing.slug) !== labSlug || String(existing.branchId) !== String(branch._id)) return NextResponse.json({ error: 'Registration key belongs to another branch' }, { status: 409 });
        if ((existing.registrationFingerprint || registrationFingerprintFor(existing)) !== registrationFingerprint) return NextResponse.json({ error: 'Registration key was already used for a different order' }, { status: 409 });
        await ensureCollectionTasks(existing, userId);
        await ensureCategoryWorklistItems(existing, lab._id, branch._id, userId);
        await ensureOrderAudit(req, existing, lab._id, branch._id, true);
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const transId = await generateTransactionId({
      labSlug,
      branchSlug,
      branchId: String(body?.branchId || ''),
      businessDate: typeof body?.bDate === 'string' ? body.bDate : undefined,
    });
    const requestedTests = Array.isArray(body?.tests) ? body.tests : [];
    const testIds = requestedTests.map((entry: any) => String(entry?.id || "")).filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    const catalogueTests = testIds.length ? await Test.find({ _id: { $in: testIds }, branchId: branch._id }).select("type category requires_specimen_collection specimen_type container_type collection_method collection_instructions collection_priority collection_config_status turnaroundHours unit resultType reportTemplateRef referenceRanges").lean() : [];
    if (testIds.some((id: string) => !catalogueTests.some((test: any) => String(test._id) === id))) return NextResponse.json({ error: 'One or more tests do not belong to this branch' }, { status: 400 });
    const catalogueById = new Map(catalogueTests.map((test: any) => [String(test._id), test]));
    const orderTests = requestedTests.map((entry: any) => {
      const catalogueTest: any = catalogueById.get(String(entry?.id || ""));
      const configStatus = catalogueTest?.collection_config_status || "needs_review";
      const requiresCollection = catalogueTest?.requires_specimen_collection === true;
      return {
        ...entry,
        type: catalogueTest?.type || entry.type || "lab",
        category: catalogueTest?.category || entry.category || "",
        requires_specimen_collection: requiresCollection,
        specimen_type: catalogueTest?.specimen_type || "",
        container_type: catalogueTest?.container_type || "",
        collection_method: catalogueTest?.collection_method || "",
        collection_instructions: catalogueTest?.collection_instructions || "",
        collection_priority: catalogueTest?.collection_priority || "routine",
        collection_config_status: configStatus,
        turnaroundHours: catalogueTest?.turnaroundHours,
        unit: catalogueTest?.unit || entry.unit || "",
        resultType: catalogueTest?.resultType || entry.resultType || "numeric",
        reportTemplateRef: catalogueTest?.reportTemplateRef ? String(catalogueTest.reportTemplateRef) : entry.reportTemplateRef || "",
        referenceRanges: Array.isArray(catalogueTest?.referenceRanges) ? catalogueTest.referenceRanges : [],
        collection_status: catalogueTest?.type === "scan" ? "not_applicable" : configStatus !== "configured" ? "needs_configuration" : requiresCollection ? "pending_collection" : "not_required",
      };
    });
    const payload = {
      ...body,
      slug: labSlug,
      branch: branchSlug,
      branchId: String(branch._id),
      tests: orderTests,
      registrationFingerprint,
      bonus: Number(body?.bonus ?? 0),
      transId,
    };
    const order = await Order.create(payload);
    await ensureCollectionTasks(order, userId);
    await ensureCategoryWorklistItems(order, lab._id, branch._id, userId);
    await ensureOrderAudit(req, order, lab._id, branch._id, false);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      try {
        if (requestRegistrationKey) {
          const existing = await Order.findOne({ registrationKey: requestRegistrationKey });
          if (existing) {
            if (String(existing.slug) !== String(requestLab?.slug) || String(existing.branchId) !== String(requestBranch?._id)) return NextResponse.json({ error: 'Registration key belongs to another branch' }, { status: 409 });
            if ((existing.registrationFingerprint || registrationFingerprintFor(existing)) !== requestFingerprint) return NextResponse.json({ error: 'Registration key was already used for a different order' }, { status: 409 });
            await ensureCollectionTasks(existing, requestUserId);
            await ensureCategoryWorklistItems(existing, requestLab._id, requestBranch._id, requestUserId);
            await ensureOrderAudit(req, existing, requestLab._id, requestBranch._id, true);
            return NextResponse.json(existing, { status: 200 });
          }
        }
      } catch { /* handled by the original error below */ }
    }
    console.error('Error creating test order:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function ensureCategoryWorklistItems(order: any, labId: mongoose.Types.ObjectId, branchId: mongoose.Types.ObjectId, userId: string) {
  if (!order || order.isCancelled || !Array.isArray(order.tests)) return;
  const categories = await Category.find({ labId, branchId, isCancelled: { $ne: true } }).select("_id name").lean();
  const categoryByName = new Map(categories.map((category: any) => [String(category.name || "").trim().toLocaleLowerCase(), category]));
  const orderDate = order.createdAt || new Date();
  for (let index = 0; index < order.tests.length; index += 1) {
    const test = order.tests[index];
    const category = categoryByName.get(String(test?.category || "").trim().toLocaleLowerCase());
    if (!test || !category) continue;
    const type = String(test.type || "lab").toLowerCase();
    const requiresSpecimen = test.requires_specimen_collection === true;
    const needsConfiguration = type !== "scan" && test.collection_config_status !== "configured";
    const eligible = type === "scan" || (!requiresSpecimen && !needsConfiguration);
    const initialStatus = eligible ? "Awaiting Processing" : needsConfiguration ? "On Hold" : "Awaiting Specimen";
    const reason = eligible ? "" : needsConfiguration ? "Specimen collection requirement needs configuration" : "Waiting for the required specimen to be collected and accepted";
    const turnaroundHours = Number.isFinite(Number(test.turnaroundHours)) ? Math.max(0, Number(test.turnaroundHours)) : undefined;
    const dueAt = turnaroundHours === undefined ? undefined : new Date(new Date(orderDate).getTime() + turnaroundHours * 3600000);
    const orderTestId = `${String(order._id)}:${index}`;
    await CategoryWorklistItem.updateOne(
      { orderId: String(order._id), orderTestId },
      { $setOnInsert: {
        labId, branchId, categoryId: category._id, category: category.name,
        orderId: String(order._id), orderNumber: String(order.transId || ""), orderTestId,
        catalogueTestId: String(test.id || test.testId || ""), testName: String(test.name || "Unnamed test"), testType: type,
        patientId: String(order.patientId || ""), patientName: String(order.name || ""), patientGender: String(order.gender || ""),
        orderDate, orderPriority: String(order.priority || "Routine"), priority: String(test.collection_priority || "").toLowerCase() === "stat" ? "STAT" : String(test.collection_priority || "").toLowerCase() === "urgent" ? "Urgent" : "Routine",
        requiresSpecimen, eligibleForProcessing: eligible, eligibilityReason: reason, turnaroundHours, dueAt,
        status: initialStatus, createdBy: userId, updatedBy: userId,
      } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function ensureOrderAudit(req: NextRequest, order: any, labId: unknown, branchId: unknown, recoveredOnRetry: boolean) {
  const exists = await AuditLog.exists({ entityType: 'Order', entityId: String(order._id), action: 'create' });
  if (exists) return;
  await writeAuditLog(req, {
    action: 'create', entityType: 'Order', entityId: order._id, labId, branchId,
    changes: { transId: order.transId, slug: order.slug, branch: order.branch },
    metadata: { labSlug: order.slug, branchSlug: order.branch, recoveredOnRetry },
  });
}

async function ensureCollectionTasks(order: any, userId: string) {
  const branchId = String(order.branchId || '');
  const lab = await Lab.findOne({ slug: order.slug }).select('_id owner').lean();
  const branch = branchId && mongoose.Types.ObjectId.isValid(branchId)
    ? await Branch.findById(branchId).select('_id slug').lean()
    : await Branch.findOne({ slug: order.branch }).select('_id slug').lean();
  if (!lab || !branch) throw new Error('Could not resolve the lab and branch for specimen collection tasks');

  const orderedTests = Array.isArray(order.tests) ? order.tests : [];
  for (let index = 0; index < orderedTests.length; index += 1) {
    const test = orderedTests[index];
    if (!test || test.requires_specimen_collection !== true || test.collection_status === 'not_applicable') continue;
    const catalogueTestId = String(test.id || test.testId || '');
    const orderTestId = `${String(order._id)}:${index}`;
    const priority = String(test.collection_priority || '').toLowerCase();
    const taskPriority = priority === 'stat' ? 'STAT' : priority === 'urgent' ? 'Urgent' : 'Routine';
    const taskFilter = { orderId: String(order._id), collectionTaskKey: orderTestId };
    const legacyTask = await Specimen.findOne({ orderId: String(order._id), orderTestId, collectionTaskKey: { $exists: false } });
    if (legacyTask) {
      legacyTask.collectionTaskKey = orderTestId;
      if (!legacyTask.orderedTests?.length && catalogueTestId) legacyTask.orderedTests = [{
        orderTestId, catalogueTestId, testName: String(test.name || 'Unnamed test'), category: String(test.category || ''),
        requiredSpecimenType: String(test.specimen_type || ''), requiredContainerType: String(test.container_type || ''),
        collectionMethod: String(test.collection_method || ''), collectionInstructions: String(test.collection_instructions || ''),
        collectionPriority: String(test.collection_priority || 'routine'),
      }] as never;
      await legacyTask.save();
      continue;
    }
    try {
      await Specimen.updateOne(
      taskFilter,
      { $setOnInsert: {
        sampleId: `SP-${new mongoose.Types.ObjectId().toString().slice(-10).toUpperCase()}`,
        labId: lab._id,
        branchId: branch._id,
        labSlug: order.slug,
        branchSlug: order.branch,
        patientId: String(order.patientId || ''),
        patientName: String(order.name || ''),
        orderId: String(order._id),
        orderedTestId: orderTestId,
        collectionTaskKey: orderTestId,
        orderedTestIds: catalogueTestId ? [catalogueTestId] : [],
        orderedTests: catalogueTestId ? [{
          orderTestId,
          catalogueTestId,
          testName: String(test.name || 'Unnamed test'),
          category: String(test.category || ''),
          requiredSpecimenType: String(test.specimen_type || ''),
          requiredContainerType: String(test.container_type || ''),
          collectionMethod: String(test.collection_method || ''),
          collectionInstructions: String(test.collection_instructions || ''),
          collectionPriority: String(test.collection_priority || 'routine'),
        }] : [],
        orderNumber: String(order.transId || ''),
        tests: [String(test.name || 'Unnamed test')],
        category: String(test.category || ''),
        priority: taskPriority,
        specimenType: String(test.specimen_type || 'Unconfigured'),
        container: String(test.container_type || ''),
        collectionMethod: String(test.collection_method || ''),
        handling: String(test.collection_instructions || ''),
        collectionInstructions: String(test.collection_instructions || ''),
        status: 'Pending Collection',
        registeredAt: order.createdAt || new Date(),
        createdBy: userId,
        updatedBy: userId,
      } },
      { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000 || !await Specimen.exists(taskFilter)) throw error;
    }
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    const userId = String(session?.user?.id || '');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch');
    const branchId = url.searchParams.get('branchId');
    const patientId = url.searchParams.get('patientId');
    const includeCancelled = url.searchParams.get('includeCancelled') === 'true';
    let query: any = {};
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) return NextResponse.json({ error: 'Invalid branch id' }, { status: 400 });
      const branchDoc = await Branch.findById(branchId).select('_id slug').lean();
      const lab = branchDoc ? await Lab.findOne({ branches: branchDoc._id }).select('_id owner').lean() : null;
      if (!lab || (String(lab.owner) !== userId && !await LabMembership.exists({ user: userId, labId: lab._id, branchId: branchDoc!._id, status: 'active' }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      query.branchId = branchId;
    } else if (branch) {
      const branchDoc = await Branch.findOne({ $or: [{ slug: branch }, { branch }] }).select('_id slug').lean();
      const lab = branchDoc ? await Lab.findOne({ branches: branchDoc._id }).select('_id owner').lean() : null;
      if (!lab || (String(lab.owner) !== userId && !await LabMembership.exists({ user: userId, labId: lab._id, branchId: branchDoc!._id, status: 'active' }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      query.branchId = branchDoc!._id;
    } else {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }
    if (patientId) {
      query.patientId = patientId;
    }
    if (!includeCancelled) {
      query.isCancelled = { $ne: true };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
