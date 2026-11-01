import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import Branch from "@/models/Branch";
import CategoryWorklistItem from "@/models/CategoryWorklistItem";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";
import Order from "@/models/Order";
import Patient from "@/models/patient";
import Specimen from "@/models/Specimen";
import Test from "@/models/Test";
import ScanReportTemplate from "@/models/ScanReportTemplate";
import Category from "@/models/Category";

function hasResultContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasResultContent);
  return String(value).trim().length > 0;
}

async function authorize(itemId: string) {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.id || "");
  if (!userId) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(itemId)) return { response: NextResponse.json({ error: "Invalid worklist item" }, { status: 400 }) };
  const item: any = await CategoryWorklistItem.findById(itemId).lean();
  if (!item) return { response: NextResponse.json({ error: "Worklist item not found" }, { status: 404 }) };
  const [branch, lab] = await Promise.all([
    Branch.findById(item.branchId).select("_id slug branch").lean(),
    Lab.findOne({ branches: item.branchId }).select("_id owner slug").lean(),
  ]);
  if (!branch || !lab) return { response: NextResponse.json({ error: "Worklist branch not found" }, { status: 404 }) };
  const owner = String((lab as any).owner) === userId;
  const membership: any = owner ? null : await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: "active" }).select("role permissions worklistCategoryIds name").lean();
  if (!owner && !membership) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const role = owner ? "owner" : String(membership.role || "staff").toLowerCase();
  const canManage = owner || ["admin", "manager"].includes(role) || membership?.permissions?.includes("*");
  const categoryAllowed = canManage || (Array.isArray(membership?.worklistCategoryIds) && membership.worklistCategoryIds.some((id: any) => String(id) === String(item.categoryId)));
  if (!categoryAllowed) return { response: NextResponse.json({ error: "You are not assigned to this category worklist" }, { status: 403 }) };
  return { item, lab, branch, userId, userName: String(session?.user?.name || membership?.name || "Staff"), membership, role, canManage };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ctx = await authorize(id);
  if ("response" in ctx) return ctx.response;
  const [order, test, specimen, patient] = await Promise.all([
    Order.findById(ctx.item.orderId).lean(),
    Test.findOne({ _id: ctx.item.catalogueTestId, branchId: ctx.branch._id }).lean(),
    ctx.item.specimenId ? Specimen.findOne({ _id: ctx.item.specimenId, labId: ctx.lab._id, branchId: ctx.branch._id }).lean() : Promise.resolve(null),
    Patient.findOne({ regNumber: ctx.item.patientId, labId: ctx.lab._id, branch: ctx.branch._id }).select("regNumber name gender dateOfBirth age").lean(),
  ]);
  if (!order || order.isCancelled || String(order.branchId || "") !== String(ctx.branch._id)) return NextResponse.json({ error: "The order is unavailable or cancelled" }, { status: 409 });
  const templateId = String((test as any)?.reportTemplateRef || "");
  const template = templateId ? await ScanReportTemplate.findOne({ _id: templateId, branchId: ctx.branch._id, isCancelled: false, isActive: true }).lean() : null;
  return NextResponse.json({
    item: ctx.item,
    order: { id: String(order._id), orderNumber: order.transId, createdAt: order.createdAt, status: order.status },
    patient: patient || { regNumber: ctx.item.patientId, name: ctx.item.patientName, gender: (order as any).gender || "" },
    test: test ? { id: String(test._id), name: test.name, category: test.category, type: test.type, resultType: test.resultType, unit: test.unit || "", turnaroundHours: test.turnaroundHours, referenceRanges: test.referenceRanges || [], reportTemplateRef: test.reportTemplateRef ? String(test.reportTemplateRef) : "" } : { id: ctx.item.catalogueTestId, name: ctx.item.testName, category: ctx.item.category, type: "lab", resultType: "text", unit: "", referenceRanges: [] },
    specimen: specimen ? { sampleId: specimen.sampleId, physicalSpecimenId: specimen.physicalSpecimenId, accessionNumber: specimen.accessionNumber, specimenType: specimen.specimenType, container: specimen.container, status: specimen.status, receivedAt: specimen.receivedAt, receivingStaff: specimen.receivingStaff } : null,
    resultTemplate: template,
    canManage: ctx.canManage,
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ctx = await authorize(id);
  if ("response" in ctx) return ctx.response;
  try {
    const body = await req.json();
    const item: any = await CategoryWorklistItem.findOne({ _id: id, labId: ctx.lab._id, branchId: ctx.branch._id });
    if (!item) return NextResponse.json({ error: "Worklist item not found" }, { status: 404 });
    const now = new Date();
    const previousStatus = String(item.status);
    const action = String(body.action || "");
    const order = await Order.findById(item.orderId).select("isCancelled");
    if (!order || order.isCancelled) {
      item.status = "Cancelled";
      item.eligibleForProcessing = false;
      item.eligibilityReason = "The patient order was cancelled";
      item.updatedBy = ctx.userId as never;
      item.history.push({ action: "order_cancelled", fromStatus: previousStatus, toStatus: "Cancelled", reason: item.eligibilityReason, staffId: ctx.userId as never, staffName: ctx.userName, at: now });
      await item.save();
      return NextResponse.json({ error: "The order was cancelled; this worklist item is now cancelled" }, { status: 409 });
    }

    if (action === "assignToMe" || action === "assign") {
      if (!item.eligibleForProcessing) return NextResponse.json({ error: item.eligibilityReason || "This test is not ready for processing" }, { status: 409 });
      let staffId = ctx.userId;
      let staffName = ctx.userName;
      if (action === "assign") {
        if (!ctx.canManage) return NextResponse.json({ error: "Only a manager can assign work to another staff member" }, { status: 403 });
        staffId = String(body.staffId || "");
        const member: any = await LabMembership.findOne({ user: staffId, labId: ctx.lab._id, branchId: ctx.branch._id, status: "active" }).select("name role worklistCategoryIds").lean();
        const authorized = member && (["manager", "admin"].includes(String(member.role).toLowerCase()) || member.worklistCategoryIds?.some((categoryId: any) => String(categoryId) === String(item.categoryId)));
        if (!authorized) return NextResponse.json({ error: "Choose active staff assigned to this category" }, { status: 400 });
        staffName = String(member.name || "Staff");
      }
      if (["Completed", "Cancelled", "On Hold", "Awaiting Specimen"].includes(item.status)) return NextResponse.json({ error: "This worklist item cannot be assigned in its current status" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== staffId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      item.assignedStaffId = staffId as never;
      item.assignedStaffName = staffName;
      item.assignedAt = now;
      if (item.status === "Awaiting Processing") item.status = "Assigned";
    } else if (action === "start") {
      if (!item.eligibleForProcessing) return NextResponse.json({ error: item.eligibilityReason || "This test is not ready for processing" }, { status: 409 });
      if (!["Awaiting Processing", "Assigned"].includes(item.status)) return NextResponse.json({ error: "Only pending or assigned items can be started" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      if (!item.assignedStaffId) { item.assignedStaffId = ctx.userId as never; item.assignedStaffName = ctx.userName; item.assignedAt = now; }
      item.status = "In Progress";
      item.processingStartedAt ||= now;
    } else if (action === "hold") {
      const reason = String(body.reason || "").trim();
      if (!reason) return NextResponse.json({ error: "A reason is required to put work on hold" }, { status: 400 });
      if (!["Assigned", "In Progress", "Awaiting Result Entry", "Awaiting Processing"].includes(item.status)) return NextResponse.json({ error: "This item cannot be placed on hold in its current status" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      item.statusBeforeHold = item.status;
      item.status = "On Hold";
      item.holdReason = reason;
    } else if (action === "resume") {
      if (item.status !== "On Hold") return NextResponse.json({ error: "Only held items can be resumed" }, { status: 409 });
      if (!item.eligibleForProcessing) return NextResponse.json({ error: item.eligibilityReason || "This test is still waiting for its specimen" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      item.status = ["Assigned", "In Progress", "Awaiting Result Entry"].includes(item.statusBeforeHold) ? item.statusBeforeHold : "Awaiting Processing";
      item.statusBeforeHold = "";
      item.holdReason = "";
    } else if (action === "awaitResult") {
      if (item.status !== "In Progress") return NextResponse.json({ error: "Only in-progress tests can move to result entry" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      item.status = "Awaiting Result Entry";
    } else if (action === "complete") {
      if (item.status !== "Awaiting Result Entry") return NextResponse.json({ error: "Save a result before completing this work item" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      if (!hasResultContent(item.result)) return NextResponse.json({ error: "A result is required before completion" }, { status: 400 });
      item.status = "Completed";
      item.completedAt = now;
    } else if (action === "saveResult") {
      if (!item.eligibleForProcessing || !["In Progress", "Awaiting Result Entry"].includes(item.status)) return NextResponse.json({ error: "Start this eligible test before entering a result" }, { status: 409 });
      if (item.assignedStaffId && String(item.assignedStaffId) !== ctx.userId && !ctx.canManage) return NextResponse.json({ error: "This item is assigned to another staff member" }, { status: 403 });
      const test: any = await Test.findOne({ _id: item.catalogueTestId, branchId: ctx.branch._id }).select("resultType type reportTemplateRef").lean();
      if (!test) return NextResponse.json({ error: "The ordered test definition is unavailable" }, { status: 409 });
      const result = body.result;
      if (!hasResultContent(result)) return NextResponse.json({ error: "Enter a result before saving" }, { status: 400 });
      if (test?.resultType === "numeric" && result && typeof result !== "object" && !Number.isFinite(Number(result))) return NextResponse.json({ error: "Enter a valid numeric result" }, { status: 400 });
      if (test.type === "scan" && test.reportTemplateRef) {
        const template: any = await ScanReportTemplate.findOne({ _id: test.reportTemplateRef, branchId: ctx.branch._id, isCancelled: false, isActive: true }).select("sections").lean();
        if (!template) return NextResponse.json({ error: "The configured result template is unavailable" }, { status: 409 });
        const sections = result && typeof result === "object" && result.sections && typeof result.sections === "object" ? result.sections : {};
        const missing = (template.sections || []).filter((section: any) => section.required && !String(sections[section.key] ?? "").trim()).map((section: any) => section.title);
        if (missing.length) return NextResponse.json({ error: `Complete required template sections: ${missing.join(", ")}` }, { status: 400 });
      }
      item.result = result;
      item.resultEnteredAt = now;
      item.resultUpdatedAt = now;
      item.resultUpdatedBy = ctx.userId as never;
      item.status = "Awaiting Result Entry";
    } else {
      return NextResponse.json({ error: "Unsupported worklist action" }, { status: 400 });
    }

    item.updatedBy = ctx.userId as never;
    item.history.push({ action, fromStatus: previousStatus, toStatus: item.status, reason: action === "hold" ? item.holdReason : "", staffId: ctx.userId as never, staffName: ctx.userName, at: now });
    await item.save();
    await AuditLog.create({ action: "status_change", entityType: "CategoryWorklistItem", entityId: String(item._id), actorId: ctx.userId, actorName: ctx.userName, labId: ctx.lab._id, branchId: ctx.branch._id, changes: { previousStatus, newStatus: item.status, action }, metadata: { orderNumber: item.orderNumber, testName: item.testName, category: item.category } });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update worklist item" }, { status: 400 });
  }
}
