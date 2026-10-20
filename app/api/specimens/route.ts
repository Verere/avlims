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

const requiredChecks = ["identity", "request", "container", "procedure", "label", "details", "handling"];
const allowedStatuses = ["Pending Collection", "Collected", "In Transit", "Received in Lab", "Processing", "Accepted", "Rejected", "Cancelled"] as const;

async function context(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const labSlug = String(req.nextUrl.searchParams.get("labSlug") || "").trim();
  const branchSlug = String(req.nextUrl.searchParams.get("branchSlug") || "").trim();
  if (!labSlug || !branchSlug) return { response: NextResponse.json({ error: "Lab and branch are required" }, { status: 400 }) };
  await dbConnect();
  const lab = await Lab.findOne({ slug: labSlug }).select("_id owner").lean();
  if (!lab) return { response: NextResponse.json({ error: "Lab not found" }, { status: 404 }) };
  const branch = await Branch.findOne({ $or: [{ slug: branchSlug }, { branch: branchSlug }] }).select("_id slug branch").lean();
  if (!branch) return { response: NextResponse.json({ error: "Branch not found" }, { status: 404 }) };
  const isOwner = String(lab.owner) === userId;
  const membership = await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: "active" }).select("role permissions name").lean();
  if (!isOwner && !membership) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { lab, branch, userId, userName: session?.user?.name || membership?.name || "Staff", role: isOwner ? "owner" : String(membership?.role || "staff").toLowerCase() };
}

export async function GET(req: NextRequest) {
  const ctx = await context(req);
  if ("response" in ctx) return ctx.response;
  const { lab, branch } = ctx;
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  const query: Record<string, unknown> = { labId: lab._id, branchId: branch._id };
  if (q) query.$or = [{ sampleId: { $regex: q, $options: "i" } }, { patientName: { $regex: q, $options: "i" } }, { patientId: { $regex: q, $options: "i" } }, { orderNumber: { $regex: q, $options: "i" } }];
  const specimens = await Specimen.find(query).sort({ createdAt: -1 }).limit(500).lean();
  return NextResponse.json(specimens);
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
    if (!patientId || !orderNumber || !specimenType) return NextResponse.json({ error: "Patient, order number, and specimen type are required" }, { status: 400 });
    if (isConfirm && requiredChecks.some((key) => checks[key] !== true)) return NextResponse.json({ error: "Complete every collection verification check before confirming" }, { status: 400 });
    if (body.acceptance === "Accepted" && !["owner", "admin", "manager"].includes(ctx.role)) return NextResponse.json({ error: "Only authorized staff can accept specimens" }, { status: 403 });
    if (body.acceptance === "Rejected" && !String(body.rejectionReason || "").trim()) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    const patientLookup = mongoose.Types.ObjectId.isValid(patientId) ? { $or: [{ _id: patientId }, { regNumber: patientId }] } : { regNumber: patientId };
    const patient = await Patient.findOne({ ...patientLookup, labId: lab._id, branch: branch._id, isCancelled: { $ne: true } }).select("name regNumber").lean();
    if (!patient) return NextResponse.json({ error: "Patient not found in this branch" }, { status: 404 });
    const order = await Order.findOne({ transId: orderNumber, slug: req.nextUrl.searchParams.get("labSlug"), branch: req.nextUrl.searchParams.get("branchSlug"), patientId: { $in: [patientId, String(patient._id)] }, isCancelled: { $ne: true } }).select("transId tests patientId").lean();
    if (!order) return NextResponse.json({ error: "Laboratory order not found for this patient and branch" }, { status: 404 });
    const now = new Date();
    const status = isConfirm ? "Collected" : "Pending Collection";
    const specimen = await Specimen.create({
      sampleId: `SP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      labId: lab._id, branchId: branch._id, labSlug: req.nextUrl.searchParams.get("labSlug"), branchSlug: req.nextUrl.searchParams.get("branchSlug"),
      patientId, patientName: patient.name, orderId: String(order._id), orderNumber, tests: Array.isArray(body.tests) ? body.tests.map(String).slice(0, 20) : [],
      department: String(body.department || ""), priority: ["Routine", "Urgent", "STAT"].includes(body.priority) ? body.priority : "Routine",
      specimenType, container: String(body.container || ""), collectionMethod: String(body.collectionMethod || ""), collectionSite: String(body.collectionSite || ""),
      containers: Math.max(1, Math.min(50, Number(body.containers) || 1)), volume: String(body.volume || ""), collectionAt: isConfirm ? now : undefined,
      collectorName: String(body.collectorName || userName), location: String(body.location || ""), condition: String(body.condition || "Acceptable"), handling: String(body.handling || ""),
      checks, acceptance: body.acceptance === "Rejected" ? "Rejected" : body.acceptance === "Accepted" ? "Accepted" : "Pending Review",
      rejectionReason: String(body.rejectionReason || ""), comments: String(body.comments || ""), status,
      history: [{ status, at: now, userId, userName, note: isConfirm ? "Collection confirmed" : "Draft saved" }], createdBy: userId, updatedBy: userId,
    });
    return NextResponse.json(specimen, { status: 201 });
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
    const specimen = await Specimen.findOne({ _id: body.id, labId: ctx.lab._id, branchId: ctx.branch._id });
    if (!specimen) return NextResponse.json({ error: "Specimen not found" }, { status: 404 });
    const next = String(body.status || "") as (typeof allowedStatuses)[number];
    const transitions: Record<string, string[]> = { "Pending Collection": ["Collected", "Cancelled"], Collected: ["In Transit", "Received in Lab", "Accepted", "Rejected", "Cancelled"], "In Transit": ["Received in Lab", "Cancelled"], "Received in Lab": ["Accepted", "Rejected", "Processing"], Accepted: ["Processing"], Rejected: [], Processing: [], Cancelled: [] };
    if (!allowedStatuses.includes(next) || !transitions[specimen.status]?.includes(next)) return NextResponse.json({ error: "That status transition is not allowed" }, { status: 409 });
    if (next === "Collected" && requiredChecks.some((key) => specimen.checks?.get(key) !== true)) return NextResponse.json({ error: "Collection checklist is incomplete" }, { status: 400 });
    if (next === "Rejected" && !String(body.rejectionReason || "").trim()) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    if (next === "Accepted" && !["owner", "admin", "manager"].includes(ctx.role)) return NextResponse.json({ error: "Only authorized staff can accept specimens" }, { status: 403 });
    const now = new Date();
    specimen.status = next;
    specimen.updatedBy = ctx.userId as never;
    if (next === "Collected") specimen.collectionAt = now;
    if (next === "Received in Lab") { specimen.receivedAt = now; specimen.receivingStaff = ctx.userName; }
    if (next === "Accepted" || next === "Rejected") specimen.acceptance = next;
    if (next === "Rejected") specimen.rejectionReason = String(body.rejectionReason).trim();
    specimen.history.push({ status: next, at: now, userId: ctx.userId as never, userName: ctx.userName, note: String(body.note || body.rejectionReason || "") });
    await specimen.save();
    return NextResponse.json(specimen);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update specimen" }, { status: 400 });
  }
}
