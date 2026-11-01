import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";
import Patient from "@/models/patient";
import Order from "@/models/Order";
import Specimen from "@/models/Specimen";
import OrderSequence from "@/models/OrderSequence";
import AuditLog from "@/models/AuditLog";
import SpecimenRoutingEvent from "@/models/SpecimenRoutingEvent";
import CategoryWorklistItem from "@/models/CategoryWorklistItem";
import Category from "@/models/Category";

const requiredChecks = ["identity", "request", "container", "procedure", "label", "details", "handling"];
const allowedStatuses = ["Pending Collection", "Collection In Progress", "Collected", "In Transit", "Received in Lab", "Partially Accepted", "Processing", "Accepted", "Rejected", "Collection Failed", "Cancelled", "Collection Not Required"] as const;

async function updateOrderedTestCollectionStatus(orderId: string, orderedTestIds: string[], status: string, session?: mongoose.ClientSession) {
  if (!orderedTestIds.length) return;
  const order = await Order.findById(orderId).session(session || null);
  if (!order || !Array.isArray(order.tests)) return;
  const selectedIndexes = new Set(orderedTestIds.flatMap((key) => {
    const prefix = `${orderId}:`;
    if (!key.startsWith(prefix)) return [];
    const index = Number(key.slice(prefix.length));
    return Number.isInteger(index) && index >= 0 ? [index] : [];
  }));
  const selectedIds = new Set(orderedTestIds.map(String));
  order.tests = order.tests.map((test: any, index: number) =>
    test && typeof test === "object" && (selectedIndexes.size
      ? selectedIndexes.has(index)
      : selectedIds.has(String(test.id || test.testId || "")))
      ? { ...test, collection_status: status }
      : test
  );
  order.markModified("tests");
  await order.save(session ? { session } : undefined);
}

async function createOrReactivateRecollection(original: any, userId: string, userName: string, selectedTestIds?: string[], session?: mongoose.ClientSession) {
  const stableOrderTestId = original.orderedTests?.[0]?.orderTestId || original.orderTestId || "";
  let task = original.recollectionTaskId
    ? await Specimen.findById(original.recollectionTaskId).session(session || null)
    : await Specimen.findOne({ recollectionForSpecimenId: String(original._id) }).session(session || null);
  const selectedTests = (original.orderedTests || []).filter((test: any) => !selectedTestIds?.length || selectedTestIds.includes(String(test.orderTestId)));
  if (!task) {
    const taskKey = `${stableOrderTestId || original.orderId}:recollect:${String(original._id)}`;
    try {
      task = new Specimen({
        sampleId: `SP-${new mongoose.Types.ObjectId().toString().slice(-10).toUpperCase()}`,
        labId: original.labId, branchId: original.branchId, labSlug: original.labSlug, branchSlug: original.branchSlug,
        patientId: original.patientId, patientName: original.patientName, orderId: original.orderId,
        orderTestId: taskKey, collectionTaskKey: taskKey, orderedTestIds: selectedTests.map((test: any) => String(test.catalogueTestId || "")).filter(Boolean),
        orderedTests: selectedTests, orderNumber: original.orderNumber,
        tests: selectedTests.map((test: any) => String(test.testName)), category: original.category, department: original.department, priority: original.priority,
        specimenType: original.specimenType, container: original.container, collectionMethod: original.collectionMethod,
        collectionInstructions: original.collectionInstructions, handling: original.handling,
        recollectionForSpecimenId: String(original._id), status: "Pending Collection",
        createdBy: userId, updatedBy: userId,
        history: [{ status: "Pending Collection", at: new Date(), userId, userName, note: `Recollection required after specimen ${original.physicalSpecimenId || original.sampleId} was rejected` }],
      });
      task = session ? await task.save({ session }) : await task.save();
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      task = await Specimen.findOne({ recollectionForSpecimenId: String(original._id) }).session(session || null);
      if (!task) throw error;
    }
  } else if (["Cancelled", "Collection Failed"].includes(task.status)) {
    const priorDetails = [task.physicalSpecimenId && `accession ${task.physicalSpecimenId}`, task.collectionAt && `collected ${new Date(task.collectionAt).toISOString()}`, task.collectedBy && `by ${task.collectedBy}`, task.collectionNotes && `notes: ${task.collectionNotes}`].filter(Boolean).join(" ");
    task.status = "Pending Collection";
    task.collectionAt = undefined;
    task.physicalSpecimenId = undefined;
    task.collectedBy = undefined;
    task.collectionNotes = undefined;
    task.receivedAt = undefined;
    task.receivingStaff = undefined;
    task.rejectedAt = undefined;
    task.rejectionReason = undefined;
    task.collectionFailedAt = undefined;
    task.collectionFailedReason = undefined;
    task.cancelledAt = undefined;
    task.acceptance = "Pending Review";
    task.checks = {} as never;
    task.recollectionRequired = false;
    task.updatedBy = userId as never;
    task.history.push({ status: "Pending Collection", at: new Date(), userId: userId as never, userName, note: priorDetails ? `New attempt started; prior attempt details: ${priorDetails}` : "Collection task reactivated" });
    await task.save(session ? { session } : undefined);
  }
  original.recollectionTaskId = String(task._id);
  original.recollectionRequired = true;
  original.updatedBy = userId as never;
  await original.save(session ? { session } : undefined);
  if (selectedTests.length) await updateOrderedTestCollectionStatus(original.orderId, selectedTests.map((test: any) => String(test.orderTestId)), "pending_collection", session);
  else if (stableOrderTestId) await updateOrderedTestCollectionStatus(original.orderId, [stableOrderTestId], "pending_collection", session);
  return task;
}

async function ensureAccessionNumber(specimen: any, session: mongoose.ClientSession, at: Date) {
  if (specimen.accessionNumber) return specimen.accessionNumber as string;
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Africa/Lagos", year: "numeric" }).format(at));
  const sequence = await OrderSequence.findOneAndUpdate(
    { key: `specimen-accession:${year}` },
    { $inc: { sequence: 1 }, $setOnInsert: { key: `specimen-accession:${year}` } },
    { upsert: true, new: true, setDefaultsOnInsert: true, session },
  );
  specimen.accessionNumber = `ACC-${year}-${String(sequence.sequence).padStart(6, "0")}`;
  return specimen.accessionNumber as string;
}

async function syncCategoryWorklistDecision(specimen: any, test: any, order: any, session: mongoose.ClientSession, userId: string, userName: string, at: Date) {
  const index = Number(String(test.orderTestId || "").split(":").pop());
  const orderTest = Number.isInteger(index) && index >= 0 ? order?.tests?.[index] : null;
  const categoryName = String(test.category || orderTest?.category || "").trim();
  if (!categoryName || !orderTest) return;
  const category = await Category.findOne({ labId: specimen.labId, branchId: specimen.branchId, name: categoryName, isCancelled: { $ne: true } }).select("_id name").session(session).lean();
  if (!category) return;
  const key = { orderId: String(specimen.orderId), orderTestId: String(test.orderTestId) };
  const requiresSpecimen = orderTest.requires_specimen_collection === true;
  const turnaroundHours = Number.isFinite(Number(orderTest.turnaroundHours)) ? Math.max(0, Number(orderTest.turnaroundHours)) : undefined;
  const item = await CategoryWorklistItem.findOneAndUpdate(key, { $setOnInsert: {
    labId: specimen.labId, branchId: specimen.branchId, categoryId: category._id, category: category.name,
    orderId: String(specimen.orderId), orderNumber: String(specimen.orderNumber), orderTestId: String(test.orderTestId),
    catalogueTestId: String(test.catalogueTestId || orderTest.id || orderTest.testId || ""), testName: String(test.testName), testType: String(orderTest.type || "lab"),
    patientId: String(specimen.patientId), patientName: String(specimen.patientName), patientGender: String(order?.gender || ""),
    orderDate: order?.createdAt || at, orderPriority: String(order?.priority || "Routine"), priority: specimen.priority, requiresSpecimen, eligibleForProcessing: false,
    eligibilityReason: "Waiting for specimen reception assessment", status: "Awaiting Specimen", turnaroundHours,
    dueAt: turnaroundHours === undefined ? undefined : new Date(new Date(order?.createdAt || at).getTime() + turnaroundHours * 3600000),
    createdBy: userId,
  } }, { upsert: true, new: true, setDefaultsOnInsert: true, session });
  const previousStatus = item.status;
  const accepted = test.acceptanceStatus === "Accepted";
  const recollectionNeeded = test.recollectionRequired === true;
  const nextStatus = accepted ? "Awaiting Processing" : recollectionNeeded ? "Awaiting Specimen" : "On Hold";
  item.categoryId = category._id as never;
  item.category = category.name;
  item.requiresSpecimen = requiresSpecimen;
  item.eligibleForProcessing = accepted;
  item.eligibilityReason = accepted ? "" : recollectionNeeded ? "Waiting for required recollection" : `Specimen rejected: ${String(test.rejectionReason || "No reason recorded")}`;
  item.specimenId = specimen._id;
  item.sampleId = String(specimen.sampleId || "");
  item.physicalSpecimenId = String(specimen.physicalSpecimenId || "");
  item.accessionNumber = String(specimen.accessionNumber || "");
  item.specimenType = String(specimen.specimenType || "");
  item.specimenStatus = accepted ? "Accepted" : "Rejected";
  item.specimenAcceptedAt = accepted ? at : undefined;
  item.status = nextStatus;
  item.updatedBy = userId as never;
  item.history.push({ action: accepted ? "specimen_accepted" : "specimen_rejected", fromStatus: previousStatus, toStatus: nextStatus, reason: accepted ? "Specimen accepted for this ordered test" : item.eligibilityReason, staffId: userId as never, staffName: userName, at });
  await item.save({ session });
}

async function context(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const labSlug = String(req.nextUrl.searchParams.get("labSlug") || "").trim();
  const branchSlug = String(req.nextUrl.searchParams.get("branchSlug") || "").trim();
  if (!labSlug || !branchSlug) return { response: NextResponse.json({ error: "Lab and branch are required" }, { status: 400 }) };
  await dbConnect();
  const lab = await Lab.findOne({ slug: labSlug }).select("_id owner branches").lean();
  if (!lab) return { response: NextResponse.json({ error: "Lab not found" }, { status: 404 }) };
  const branch = await Branch.findOne({ $or: [{ slug: branchSlug }, { branch: branchSlug }] }).select("_id slug branch").lean();
  if (!branch) return { response: NextResponse.json({ error: "Branch not found" }, { status: 404 }) };
  if (!(lab as any).branches?.some((id: any) => String(id) === String(branch._id))) return { response: NextResponse.json({ error: "Branch does not belong to this lab" }, { status: 404 }) };
  const isOwner = String(lab.owner) === userId;
  const membership = await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: "active" }).select("role permissions name").lean();
  if (!isOwner && !membership) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { lab, branch, userId, userName: session?.user?.name || membership?.name || "Staff", role: isOwner ? "owner" : String(membership?.role || "staff").toLowerCase() };
}

export async function GET(req: NextRequest) {
  const ctx = await context(req);
  if ("response" in ctx) return ctx.response;
  const { lab, branch } = ctx;
  const params = req.nextUrl.searchParams;
  const base: Record<string, any> = { labId: lab._id, branchId: branch._id };
  const receptionQueue = params.get("queue") === "reception";
  if (receptionQueue) base.$and = [{ status: { $nin: ["Pending Collection", "Collection In Progress", "Collection Failed", "Cancelled", "Collection Not Required"] } }];
  const q = String(params.get("q") || "").trim();
  if (q) base.$or = ["patientName", "patientId", "orderNumber", "tests", "sampleId", "physicalSpecimenId", "accessionNumber", "collectedBy", "receivingStaff"].map((field) => ({ [field]: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }));
  const exactFilters: Array<[string, string]> = [["status", "status"], ["specimenType", "specimenType"], ["category", "category"], ["priority", "priority"]];
  for (const [param, field] of exactFilters) { const value = String(params.get(param) || "").trim(); if (value && value !== "All") base[field] = value; }
  const department = String(params.get("department") || "").trim();
  if (department && department !== "All") base.$and = [...(base.$and || []), { $or: [{ department }, { department: { $in: [null, ""] }, category: department }] }];
  const testName = String(params.get("testName") || "").trim();
  if (testName) base.tests = { $regex: testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const dateRange: Record<string, Date> = {};
  const from = params.get("dateFrom"); const to = params.get("dateTo");
  if (from && !Number.isNaN(Date.parse(from))) dateRange.$gte = new Date(`${from}T00:00:00+01:00`);
  if (to && !Number.isNaN(Date.parse(to))) dateRange.$lt = new Date(new Date(`${to}T00:00:00+01:00`).getTime() + 86400000);
  const dateField = params.get("dateField") === "receivedAt" ? "receivedAt" : "registeredAt";
  if (Object.keys(dateRange).length) base.$and = [...(base.$and || []), dateField === "receivedAt" ? { receivedAt: dateRange } : { $or: [{ registeredAt: dateRange }, { registeredAt: { $exists: false }, createdAt: dateRange }] }];
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize")) || 25));
  const pending: Record<string, any> = { labId: lab._id, branchId: branch._id, status: { $in: ["Pending Collection", "Collection In Progress"] } };
  const now = new Date();
  const lagosDateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const datePart = (type: string) => lagosDateParts.find((part) => part.type === type)?.value || "";
  const todayStart = new Date(`${datePart("year")}-${datePart("month")}-${datePart("day")}T00:00:00+01:00`);
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const [specimens, total, pendingCollectionCount, urgentCollectionCount, overdueCollectionCount, collectedTodayCount, categories, specimenTypes, departments, awaitingReceiptCount, acceptedCount, rejectedCount, recollectionRequiredCount, receivedTodayCount] = await Promise.all([
    Specimen.find(base).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Specimen.countDocuments(base),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, status: "Pending Collection" }),
    Specimen.countDocuments({ ...pending, priority: { $in: ["Urgent", "STAT"] } }),
    Specimen.countDocuments({ ...pending, collectionDeadline: { $lt: now } }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, $or: [
      { collectionAt: { $gte: todayStart, $lt: tomorrowStart } },
      { history: { $elemMatch: { status: "Collected", at: { $gte: todayStart, $lt: tomorrowStart } } } },
    ] }),
    Specimen.distinct("category", { labId: lab._id, branchId: branch._id, category: { $nin: [null, ""] } }),
    Specimen.distinct("specimenType", { labId: lab._id, branchId: branch._id, specimenType: { $nin: [null, ""] } }),
    Specimen.distinct("department", { labId: lab._id, branchId: branch._id, department: { $nin: [null, ""] } }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, status: { $in: ["Collected", "In Transit"] } }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, status: "Accepted" }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, status: "Rejected" }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, recollectionRequired: true }),
    Specimen.countDocuments({ labId: lab._id, branchId: branch._id, receivedAt: { $gte: todayStart, $lt: tomorrowStart } }),
  ]);
  const branchDoc = await Branch.findById(branch._id).select("specimenAcceptanceCriteria specimenRejectionReasons").lean();
  return NextResponse.json({ specimens, total, page, pageSize, pendingCollectionCount, urgentCollectionCount, overdueCollectionCount, collectedTodayCount, categories, specimenTypes, departments: [...new Set([...departments, ...categories])].filter(Boolean), awaitingReceiptCount, acceptedCount, rejectedCount, recollectionRequiredCount, receivedTodayCount, acceptanceCriteria: (branchDoc as any)?.specimenAcceptanceCriteria?.length ? (branchDoc as any).specimenAcceptanceCriteria : ["Identity matches order", "Correct specimen type", "Correct container", "Sufficient quantity", "Collection and transport timing acceptable", "Specimen condition acceptable"], rejectionReasons: (branchDoc as any)?.specimenRejectionReasons?.length ? (branchDoc as any).specimenRejectionReasons : ["Incorrect identification", "Wrong container", "Insufficient quantity", "Leakage", "Unsuitable condition", "Compromised transport", "Other"] });
}

export async function POST(req: NextRequest) {
  const ctx = await context(req);
  if ("response" in ctx) return ctx.response;
  const { lab, branch, userId, userName } = ctx;
  try {
    const body = await req.json();
    const patientId = String(body.patientId || "").trim();
    const orderNumber = String(body.orderNumber || "").trim();
    const specimenType = String(body.specimenType || "").trim();
    const checks = body.checks && typeof body.checks === "object" ? body.checks : {};
    const isConfirm = body.action === "confirm";
    if (!patientId || !orderNumber) return NextResponse.json({ error: "Patient and order number are required" }, { status: 400 });
    if (isConfirm && requiredChecks.some((key) => checks[key] !== true)) return NextResponse.json({ error: "Complete every collection verification check before confirming" }, { status: 400 });
    const patientLookup = mongoose.Types.ObjectId.isValid(patientId) ? { $or: [{ _id: patientId }, { regNumber: patientId }] } : { regNumber: patientId };
    const patient = await Patient.findOne({ ...patientLookup, labId: lab._id, branch: branch._id, isCancelled: { $ne: true } }).select("name regNumber").lean();
    if (!patient) return NextResponse.json({ error: "Patient not found in this branch" }, { status: 404 });
    const order = await Order.findOne({ transId: orderNumber, slug: req.nextUrl.searchParams.get("labSlug"), branch: req.nextUrl.searchParams.get("branchSlug"), patientId: { $in: [patientId, String(patient._id)] }, isCancelled: { $ne: true } }).select("transId tests patientId createdAt").lean();
    if (!order) return NextResponse.json({ error: "Laboratory order not found for this patient and branch" }, { status: 404 });
    const requestedTestNames = Array.isArray(body.tests) ? body.tests.map((test: unknown) => String(test).trim().toLowerCase()).filter(Boolean) : [];
    const eligibleTests = (Array.isArray(order.tests) ? order.tests : []).flatMap((test: any, index: number) => {
      if (test?.requires_specimen_collection !== true || (requestedTestNames.length && !requestedTestNames.includes(String(test.name || "").trim().toLowerCase()))) return [];
      const catalogueTestId = String(test.id || test.testId || "");
      return [{ test, catalogueTestId, orderTestId: `${String(order._id)}:${index}` }];
    });
    if (!eligibleTests.length) return NextResponse.json({ error: "This order has no tests configured for specimen collection" }, { status: 400 });
    const now = new Date();
    const tasks: any[] = [];
    const collectedOrderTestIds: string[] = [];
    for (const { test, catalogueTestId, orderTestId } of eligibleTests) {
      const priorityValue = String(test.collection_priority || "").toLowerCase();
      const taskPriority = priorityValue === "stat" ? "STAT" : priorityValue === "urgent" ? "Urgent" : "Routine";
      const baseTaskFilter = { orderId: String(order._id), collectionTaskKey: orderTestId };
      let existingTask = await Specimen.findOne(baseTaskFilter);
      if (!existingTask) {
        existingTask = await Specimen.findOne({ orderId: String(order._id), orderTestId, collectionTaskKey: { $exists: false } });
        if (existingTask) {
          existingTask.collectionTaskKey = orderTestId;
          if (!existingTask.orderedTests?.length && catalogueTestId) existingTask.orderedTests = [{ orderTestId, catalogueTestId, testName: String(test.name || "Unnamed test"), category: String(test.category || ""), requiredSpecimenType: String(test.specimen_type || ""), requiredContainerType: String(test.container_type || ""), collectionMethod: String(test.collection_method || ""), collectionInstructions: String(test.collection_instructions || ""), collectionPriority: String(test.collection_priority || "routine") }] as never;
          await existingTask.save();
        }
      }
      for (let attempt = 0; existingTask?.status === "Rejected" && existingTask.recollectionRequired && attempt < 10; attempt += 1) {
        existingTask = await createOrReactivateRecollection(existingTask, userId, userName);
      }
      if (existingTask && ["Collected", "In Transit", "Received in Lab", "Processing", "Accepted", "Rejected", "Cancelled", "Collection Not Required"].includes(existingTask.status)) {
        tasks.push(existingTask);
        continue;
      }
      const taskFilter = existingTask ? { _id: existingTask._id } : baseTaskFilter;
      let task: any;
      try {
        task = await Specimen.findOneAndUpdate(
        taskFilter,
        { $setOnInsert: {
          sampleId: `SP-${new mongoose.Types.ObjectId().toString().slice(-10).toUpperCase()}`,
          labId: lab._id, branchId: branch._id, labSlug: req.nextUrl.searchParams.get("labSlug"), branchSlug: req.nextUrl.searchParams.get("branchSlug"),
          patientId, patientName: patient.name, orderId: String(order._id), orderTestId, collectionTaskKey: orderTestId, orderedTestIds: catalogueTestId ? [catalogueTestId] : [],
          orderedTests: catalogueTestId ? [{ orderTestId, catalogueTestId, testName: String(test.name || "Unnamed test"), category: String(test.category || ""), requiredSpecimenType: String(test.specimen_type || ""), requiredContainerType: String(test.container_type || ""), collectionMethod: String(test.collection_method || ""), collectionInstructions: String(test.collection_instructions || ""), collectionPriority: String(test.collection_priority || "routine") }] : [],
          orderNumber, tests: [String(test.name || "Unnamed test")], category: String(test.category || ""), department: String(body.department || ""),
          priority: taskPriority, specimenType: String(test.specimen_type || specimenType || "Unconfigured"), container: String(test.container_type || body.container || ""),
          collectionMethod: String(test.collection_method || body.method || ""), handling: String(test.collection_instructions || body.handling || ""), collectionInstructions: String(test.collection_instructions || ""),
          containers: Math.max(1, Math.min(50, Number(body.containers) || 1)), volume: String(body.volume || ""), condition: String(body.condition || "Acceptable"),
          collectorName: String(body.collectorName || userName), location: String(body.location || ""), collectionSite: String(body.site || ""), comments: String(body.comments || ""),
          acceptance: "Pending Review", rejectionReason: "", registeredAt: order.createdAt || now, createdBy: userId, updatedBy: userId,
        } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
        task = await Specimen.findOne(taskFilter);
        if (!task) throw error;
      }
      if (isConfirm && task.status !== "Collected") {
        task.status = "Collected";
        task.collectionAt = now;
        task.physicalSpecimenId = task.sampleId;
        task.collectedBy = String(body.collectorName || userName).trim();
        task.collectorName = task.collectedBy;
        task.collectionNotes = String(body.comments || "").trim();
        task.checks = checks;
        task.history.push({ status: "Collected", at: now, userId: userId as never, userName, note: "Collection confirmed; specimen recorded separately for this ordered test" });
        collectedOrderTestIds.push(orderTestId);
      }
      task.updatedBy = userId as never;
      await task.save();
      tasks.push(task);
    }
    if (collectedOrderTestIds.length) await updateOrderedTestCollectionStatus(String(order._id), collectedOrderTestIds, "collected");
    return NextResponse.json(tasks[0], { status: 200 });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return NextResponse.json({ error: "A sample identifier collision occurred. Please retry." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save specimen" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await context(req);
  if ("response" in ctx) return ctx.response;
  try {
    const body = await req.json();
    if (body.action === "configureCriteria") {
      if (!["owner", "admin", "manager"].includes(ctx.role)) return NextResponse.json({ error: "Only lab administrators can configure reception criteria" }, { status: 403 });
      const criteria = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 20) : [];
      const reasons = Array.isArray(body.rejectionReasons) ? body.rejectionReasons.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30) : [];
      if (!criteria.length || !reasons.length) return NextResponse.json({ error: "At least one acceptance criterion and rejection reason are required" }, { status: 400 });
      const branchDoc = await Branch.findByIdAndUpdate(ctx.branch._id, { $set: { specimenAcceptanceCriteria: criteria, specimenRejectionReasons: reasons } }, { new: true }).select("specimenAcceptanceCriteria specimenRejectionReasons").lean();
      return NextResponse.json(branchDoc);
    }

    if (["receive", "assess"].includes(String(body.action))) {
      if (!["owner", "admin", "manager", "technician", "receptionist", "staff"].includes(ctx.role)) return NextResponse.json({ error: "You are not authorized to receive or assess specimens" }, { status: 403 });
      const session = await mongoose.startSession();
      let result: any = null;
      try {
        await session.withTransaction(async () => {
          const specimen = await Specimen.findOne({ _id: body.id, labId: ctx.lab._id, branchId: ctx.branch._id }).session(session);
          if (!specimen) throw new Error("Specimen not found");
          if (body.action === "receive" && specimen.status === "Received in Lab") {
            result = specimen.toObject();
            return;
          }
          if (body.action === "assess" && ["Accepted", "Partially Accepted", "Rejected"].includes(specimen.status)) {
            result = specimen.toObject();
            return;
          }
          const previousStatus = specimen.status;
          const now = new Date();
          if (body.action === "receive") {
            if (!["Collected", "In Transit"].includes(specimen.status)) throw new Error("Only collected or in transit specimens can be received");
            await ensureAccessionNumber(specimen, session, now);
            specimen.status = "Received in Lab";
            specimen.receivedAt = now;
            specimen.receivingStaff = ctx.userName;
            specimen.history.push({ status: "Received in Lab", at: now, userId: ctx.userId as never, userName: ctx.userName, note: `Accessioned as ${specimen.accessionNumber}` });
          } else {
            if (specimen.status !== "Received in Lab") throw new Error("Only specimens awaiting assessment can be assessed");
            await ensureAccessionNumber(specimen, session, now);
            const checks = body.checks && typeof body.checks === "object" ? body.checks : {};
            const branchDoc = await Branch.findById(ctx.branch._id).select("specimenAcceptanceCriteria specimenRejectionReasons").session(session).lean() as any;
            const criteria: string[] = branchDoc?.specimenAcceptanceCriteria?.length ? branchDoc.specimenAcceptanceCriteria : ["Identity matches order", "Correct specimen type", "Correct container", "Sufficient quantity", "Collection and transport timing acceptable", "Specimen condition acceptable"];
            if (criteria.some((criterion) => checks[criterion] !== true)) throw new Error("Complete every configured acceptance check before assessment");
            const decisions = Array.isArray(body.decisions) ? body.decisions : [];
            const tests = (specimen.orderedTests || []) as any[];
            if (!tests.length) throw new Error("This specimen has no linked ordered tests to assess");
            const byId = new Map(decisions.map((decision: any) => [String(decision.orderTestId), decision]));
            for (const test of tests) {
              const decision: any = byId.get(String(test.orderTestId));
              if (!decision || !["Accepted", "Rejected"].includes(String(decision.status))) throw new Error(`Select an acceptance decision for ${test.testName}`);
              if (decision.status === "Rejected" && !String(decision.reason || "").trim()) throw new Error(`Enter a rejection reason for ${test.testName}`);
              test.acceptanceStatus = decision.status;
              test.acceptanceReason = decision.status === "Accepted" ? "" : String(decision.reason).trim();
              test.rejectionReason = decision.status === "Rejected" ? String(decision.reason).trim() : "";
              test.recollectionRequired = decision.status === "Rejected" && decision.recollectionRequired === true;
              test.assessedAt = now;
              test.assessedBy = ctx.userName;
              if (decision.status === "Accepted") test.routedAt = now;
            }
            specimen.checks = checks;
            const accepted = tests.filter((test: any) => test.acceptanceStatus === "Accepted");
            const rejected = tests.filter((test: any) => test.acceptanceStatus === "Rejected");
            specimen.status = accepted.length && rejected.length ? "Partially Accepted" : accepted.length ? "Accepted" : "Rejected";
            specimen.acceptance = accepted.length ? "Accepted" : "Rejected";
            specimen.rejectedAt = rejected.length ? now : undefined;
            specimen.rejectionReason = rejected.length ? rejected.map((test: any) => `${test.testName}: ${test.rejectionReason}`).join("; ") : "";
            specimen.recollectionRequired = rejected.some((test: any) => test.recollectionRequired);
            specimen.history.push({ status: specimen.status, at: now, userId: ctx.userId as never, userName: ctx.userName, note: rejected.length ? `Acceptance assessment completed; ${accepted.length} accepted, ${rejected.length} rejected` : "Acceptance assessment completed" });

            const order = await Order.findById(specimen.orderId).session(session);
            if (!order || order.isCancelled) throw new Error("Cancelled or missing orders cannot proceed to category worklists");
            if (order && Array.isArray(order.tests)) {
              const testByIndex = new Map<string, any>();
              for (const test of tests) testByIndex.set(String(test.orderTestId), test);
              order.tests = order.tests.map((orderTest: any, index: number) => {
                const link: any = testByIndex.get(`${String(order._id)}:${index}`);
                if (!link || !orderTest || typeof orderTest !== "object") return orderTest;
                return { ...orderTest, specimen_id: String(specimen._id), specimen_accession_number: specimen.accessionNumber, specimen_acceptance_status: link.acceptanceStatus.toLowerCase(), specimen_eligible_for_routing: link.acceptanceStatus === "Accepted", specimen_rejection_reason: link.rejectionReason || "" };
              });
              order.markModified("tests");
              await order.save({ session });
            }
            if (order) for (const test of tests) await syncCategoryWorklistDecision(specimen, test, order, session, ctx.userId, ctx.userName, now);
            for (const test of accepted) {
              await SpecimenRoutingEvent.updateOne(
                { specimenId: specimen._id, orderTestId: String(test.orderTestId) },
                { $setOnInsert: { labId: specimen.labId, branchId: specimen.branchId, specimenId: specimen._id, sampleId: specimen.sampleId, accessionNumber: specimen.accessionNumber, orderId: specimen.orderId, orderNumber: specimen.orderNumber, patientId: specimen.patientId, orderTestId: String(test.orderTestId), catalogueTestId: String(test.catalogueTestId || ""), testName: String(test.testName), department: String((test as any).department || specimen.department || test.category || ""), priority: specimen.priority, status: "eligible", acceptedAt: now, acceptedBy: ctx.userName } },
                { upsert: true, session },
              );
            }
            if (rejected.some((test: any) => test.recollectionRequired)) {
              await createOrReactivateRecollection(specimen, ctx.userId, ctx.userName, rejected.filter((test: any) => test.recollectionRequired).map((test: any) => String(test.orderTestId)), session);
            }
          }
          specimen.updatedBy = ctx.userId as never;
          await specimen.save({ session });
          await AuditLog.create([{
            action: "status_change", entityType: "Specimen", entityId: String(specimen._id), actorId: ctx.userId, actorName: ctx.userName,
            labId: ctx.lab._id, branchId: ctx.branch._id,
            changes: { previousStatus, newStatus: specimen.status, accessionNumber: specimen.accessionNumber, rejectionReason: specimen.rejectionReason, orderedTestDecisions: body.action === "assess" ? body.decisions : undefined },
            metadata: { action: body.action, orderNumber: specimen.orderNumber, sampleId: specimen.sampleId },
          }], { session });
          result = specimen.toObject();
        });
      } finally { await session.endSession(); }
      return NextResponse.json(result);
    }

    const specimen = await Specimen.findOne({ _id: body.id, labId: ctx.lab._id, branchId: ctx.branch._id });
    if (!specimen) return NextResponse.json({ error: "Specimen not found" }, { status: 404 });
    if (body.status === undefined && (body.collectionDeadline !== undefined || body.collectorName !== undefined)) {
      if (body.collectionDeadline !== undefined) {
        const deadline = body.collectionDeadline ? new Date(body.collectionDeadline) : null;
        if (deadline && Number.isNaN(deadline.getTime())) return NextResponse.json({ error: "Enter a valid collection deadline" }, { status: 400 });
        specimen.collectionDeadline = deadline || undefined;
      }
      if (body.collectorName !== undefined) specimen.collectorName = String(body.collectorName || "").trim();
      specimen.updatedBy = ctx.userId as never;
      await specimen.save();
      return NextResponse.json(specimen);
    }
    const next = String(body.status || "") as (typeof allowedStatuses)[number];
    if (["Received in Lab", "Accepted", "Partially Accepted", "Rejected"].includes(next)) return NextResponse.json({ error: "Use Specimen Reception to receive or assess specimens" }, { status: 409 });
    if (next === "Rejected" && specimen.status === "Rejected" && body.recollectionRequired === true) {
      await createOrReactivateRecollection(specimen, ctx.userId, ctx.userName);
      return NextResponse.json(specimen);
    }
    if (next === specimen.status) return NextResponse.json(specimen);
    const transitions: Record<string, string[]> = {
      "Pending Collection": ["Collection In Progress", "Collected", "Collection Not Required", "Cancelled"],
      "Collection In Progress": ["Collected", "Collection Failed", "Cancelled"],
      "Collection Failed": ["Pending Collection", "Collection In Progress", "Cancelled"],
      Collected: ["In Transit", "Cancelled"],
      "In Transit": ["Cancelled"],
      "Received in Lab": [], "Partially Accepted": [], Accepted: [], Rejected: [], Processing: [], Cancelled: [], "Collection Not Required": [],
    };
    if (!allowedStatuses.includes(next) || !transitions[specimen.status]?.includes(next)) return NextResponse.json({ error: "That status transition is not allowed" }, { status: 409 });
    if (body.checks && typeof body.checks === "object") specimen.checks = body.checks;
    if (next === "Collected" && requiredChecks.some((key) => (specimen.checks as any)?.get?.(key) !== true && (specimen.checks as any)?.[key] !== true)) return NextResponse.json({ error: "Collection checklist is incomplete" }, { status: 400 });
    if (next === "Rejected" && !String(body.rejectionReason || "").trim()) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    if (next === "Collection Failed" && !String(body.failureReason || body.note || "").trim()) return NextResponse.json({ error: "A collection failure reason is required" }, { status: 400 });
    if (next === "Accepted" && !["owner", "admin", "manager"].includes(ctx.role)) return NextResponse.json({ error: "Only authorized staff can accept specimens" }, { status: 403 });
    const now = new Date();
    const retryingFailedCollection = specimen.status === "Collection Failed" && ["Pending Collection", "Collection In Progress"].includes(next);
    if (retryingFailedCollection) {
      specimen.history.push({ status: next, at: now, userId: ctx.userId as never, userName: ctx.userName, note: `Collection retry started after failure: ${specimen.collectionFailedReason || "unspecified failure"}` });
      specimen.collectionFailedAt = undefined;
      specimen.collectionFailedReason = undefined;
      specimen.checks = {} as never;
    }
    specimen.status = next;
    specimen.updatedBy = ctx.userId as never;
    if (next === "Collected") {
      const collectionAt = body.collectionAt ? new Date(body.collectionAt) : now;
      if (Number.isNaN(collectionAt.getTime()) || collectionAt > now) return NextResponse.json({ error: "Enter a valid collection date and time" }, { status: 400 });
      specimen.collectionAt = collectionAt;
      specimen.collectedBy = String(body.collectedBy || body.collectorName || ctx.userName).trim();
      specimen.collectorName = specimen.collectedBy;
      specimen.physicalSpecimenId = String(body.physicalSpecimenId || specimen.sampleId).trim();
      specimen.collectionNotes = String(body.collectionNotes || "").trim();
    }
    if (next === "Received in Lab") { specimen.receivedAt = now; specimen.receivingStaff = ctx.userName; }
    if (next === "Accepted" || next === "Rejected") specimen.acceptance = next;
    if (next === "Rejected") {
      specimen.rejectionReason = String(body.rejectionReason).trim();
      specimen.rejectedAt = now;
      specimen.recollectionRequired = body.recollectionRequired === true;
    }
    if (next === "Collection Failed") { specimen.collectionFailedAt = now; specimen.collectionFailedReason = String(body.failureReason || body.note).trim(); }
    if (next === "Cancelled") specimen.cancelledAt = now;
    if (body.collectionNotes !== undefined) specimen.collectionNotes = String(body.collectionNotes || "").trim();
    const historyNote = String(body.note || body.rejectionReason || body.failureReason || "");
    if (!retryingFailedCollection) {
      specimen.history.push({ status: next, at: now, userId: ctx.userId as never, userName: ctx.userName, note: historyNote });
    }
    await specimen.save();
    if (next === "Rejected" && specimen.recollectionRequired) await createOrReactivateRecollection(specimen, ctx.userId, ctx.userName);
    const collectionStatus = next === "Collected" ? "collected" : next === "Cancelled" ? "cancelled" : next === "Rejected" ? specimen.recollectionRequired ? "pending_collection" : "rejected" : next === "Collection Not Required" ? "not_required" : next.toLowerCase().replace(/ /g, "_");
    const orderedTestRefs = (specimen.orderedTests || []).map((test: any) => String(test.orderTestId || "")).filter(Boolean);
    await updateOrderedTestCollectionStatus(specimen.orderId, orderedTestRefs.length ? orderedTestRefs : specimen.orderTestId ? [specimen.orderTestId] : specimen.orderedTestIds || [], collectionStatus);
    return NextResponse.json(specimen);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update specimen" }, { status: 400 });
  }
}
