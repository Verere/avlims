import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Category from "@/models/Category";
import CategoryWorklistItem from "@/models/CategoryWorklistItem";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";
import Order from "@/models/Order";

async function backfillCategory(category: any, lab: any, branch: any, labSlug: string, branchSlug: string) {
  if (category.worklistBackfillCompletedAt) return;
  const categoryPattern = new RegExp(`^${String(category.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const cursor = Order.find({
    slug: labSlug,
    isCancelled: { $ne: true },
    $and: [
      { $or: [{ branch: branchSlug }, { branchId: String(branch._id) }] },
      { "tests.category": categoryPattern },
    ],
  })
    .select("transId tests patientId name gender createdAt")
    .lean()
    .cursor();
  let operations: any[] = [];
  const flush = async () => {
    if (operations.length) await CategoryWorklistItem.bulkWrite(operations, { ordered: false });
    operations = [];
  };
  for await (const order of cursor as any) {
    const tests = Array.isArray((order as any).tests) ? (order as any).tests : [];
    for (let index = 0; index < tests.length; index += 1) {
      const test = tests[index];
      if (String(test?.category || "").trim().toLocaleLowerCase() !== String(category.name).trim().toLocaleLowerCase()) continue;
      const type = String(test.type || "lab").toLowerCase();
      const requiresSpecimen = test.requires_specimen_collection === true;
      const needsConfiguration = type !== "scan" && test.collection_config_status !== "configured";
      const eligible = type === "scan" || (!requiresSpecimen && !needsConfiguration);
      const turnaroundHours = Number.isFinite(Number(test.turnaroundHours)) ? Math.max(0, Number(test.turnaroundHours)) : undefined;
      const orderDate = (order as any).createdAt || new Date();
      operations.push({
        updateOne: {
          filter: { orderId: String((order as any)._id), orderTestId: `${String((order as any)._id)}:${index}` },
          update: { $setOnInsert: {
            labId: lab._id, branchId: branch._id, categoryId: category._id, category: category.name,
            orderId: String((order as any)._id), orderNumber: String((order as any).transId || ""), orderTestId: `${String((order as any)._id)}:${index}`,
            catalogueTestId: String(test.id || test.testId || ""), testName: String(test.name || "Unnamed test"), testType: type,
            patientId: String((order as any).patientId || ""), patientName: String((order as any).name || ""), patientGender: String((order as any).gender || ""), orderDate,
            orderPriority: String((order as any).priority || "Routine"),
            priority: String(test.collection_priority || "").toLowerCase() === "stat" ? "STAT" : String(test.collection_priority || "").toLowerCase() === "urgent" ? "Urgent" : "Routine",
            requiresSpecimen, eligibleForProcessing: eligible,
            eligibilityReason: eligible ? "" : needsConfiguration ? "Specimen collection requirement needs configuration" : "Waiting for the required specimen to be collected and accepted",
            turnaroundHours, dueAt: turnaroundHours === undefined ? undefined : new Date(new Date(orderDate).getTime() + turnaroundHours * 3600000),
            status: eligible ? "Awaiting Processing" : needsConfiguration ? "On Hold" : "Awaiting Specimen",
          } },
          upsert: true,
        },
      });
      if (operations.length >= 500) await flush();
    }
  }
  await flush();
  await Category.updateOne({ _id: category._id, labId: lab._id, branchId: branch._id }, { $set: { worklistBackfillCompletedAt: new Date() } });
}

export async function GET(req: NextRequest) {
  const userId = String((await getServerSession(authOptions))?.user?.id || "");
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const labSlug = String(params.get("labSlug") || "");
  const branchSlug = String(params.get("branchSlug") || "");
  if (!labSlug || !branchSlug) return NextResponse.json({ error: "Lab and branch are required" }, { status: 400 });
  await dbConnect();
  const lab = await Lab.findOne({ slug: labSlug }).select("_id owner branches").lean();
  const branch = await Branch.findOne({ $or: [{ slug: branchSlug }, { branch: branchSlug }] }).select("_id slug branch").lean();
  if (!lab || !branch || !(lab as any).branches?.some((id: any) => String(id) === String(branch._id))) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  const owner = String((lab as any).owner) === userId;
  const membership: any = owner ? null : await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: "active" }).select("role permissions worklistCategoryIds name").lean();
  if (!owner && !membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = owner ? "owner" : String(membership.role || "staff").toLowerCase();
  const canManage = owner || ["admin", "manager"].includes(role) || membership?.permissions?.includes("*");
  if (!canManage && !["technician", "staff"].includes(role)) return NextResponse.json({ error: "You do not have category worklist access" }, { status: 403 });

  const categoryQuery: Record<string, any> = { labId: lab._id, branchId: branch._id, isCancelled: { $ne: true } };
  if (!canManage) categoryQuery._id = { $in: (membership?.worklistCategoryIds || []).map(String) };
  const categories = await Category.find(categoryQuery).sort({ name: 1 }).select("_id name slug worklistBackfillCompletedAt").lean();
  const requestedCategoryId = String(params.get("categoryId") || "");
  const selectedCategory = requestedCategoryId ? categories.find((category: any) => String(category._id) === requestedCategoryId) : categories[0];
  if (requestedCategoryId && !selectedCategory) return NextResponse.json({ error: "You are not assigned to this category worklist" }, { status: 403 });
  if (!selectedCategory) return NextResponse.json({ categories, items: [], total: 0, page: 1, pageSize: 25, stats: { pending: 0, inProgress: 0, awaitingResults: 0, completed: 0, overdue: 0 }, staff: [], canManage, message: "No categories are assigned to your account." });

  await backfillCategory(selectedCategory, lab, branch, labSlug, branchSlug);

  const query: Record<string, any> = { labId: lab._id, branchId: branch._id, categoryId: selectedCategory._id, status: { $ne: "Cancelled" } };
  const q = String(params.get("q") || "").trim();
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["patientName", "patientId", "orderNumber", "orderTestId", "testName", "accessionNumber", "sampleId", "physicalSpecimenId", "assignedStaffName"].map(field => ({ [field]: { $regex: safe, $options: "i" } }));
  }
  const status = String(params.get("status") || "");
  if (status && status !== "All") query.status = status;
  const priority = String(params.get("priority") || "");
  if (priority && priority !== "All") query.priority = priority;
  const dateRange: Record<string, Date> = {};
  const from = params.get("dateFrom"); const to = params.get("dateTo");
  if (from && !Number.isNaN(Date.parse(from))) dateRange.$gte = new Date(`${from}T00:00:00+01:00`);
  if (to && !Number.isNaN(Date.parse(to))) dateRange.$lt = new Date(new Date(`${to}T00:00:00+01:00`).getTime() + 86400000);
  if (Object.keys(dateRange).length) query.orderDate = dateRange;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize")) || 25));
  const categoryBase = { labId: lab._id, branchId: branch._id, categoryId: selectedCategory._id, status: { $ne: "Cancelled" } };
  const now = new Date();
  const [items, total, pending, inProgress, awaitingResults, completed, overdue, staffRows] = await Promise.all([
    CategoryWorklistItem.aggregate([
      { $match: query },
      { $addFields: { priorityRank: { $switch: { branches: [{ case: { $eq: ["$priority", "STAT"] }, then: 0 }, { case: { $eq: ["$priority", "Urgent"] }, then: 1 }], default: 2 } } } },
      { $sort: { priorityRank: 1, orderDate: 1, createdAt: 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $project: { priorityRank: 0 } },
    ]),
    CategoryWorklistItem.countDocuments(query),
    CategoryWorklistItem.countDocuments({ ...categoryBase, status: { $in: ["Awaiting Specimen", "Awaiting Processing", "Assigned"] } }),
    CategoryWorklistItem.countDocuments({ ...categoryBase, status: "In Progress" }),
    CategoryWorklistItem.countDocuments({ ...categoryBase, status: "Awaiting Result Entry" }),
    CategoryWorklistItem.countDocuments({ ...categoryBase, status: "Completed" }),
    CategoryWorklistItem.countDocuments({ ...categoryBase, status: { $nin: ["Completed", "Cancelled"] }, dueAt: { $lt: now } }),
    canManage ? LabMembership.find({ labId: lab._id, branchId: branch._id, status: "active", role: { $in: ["technician", "staff", "manager", "admin"] }, $or: [{ worklistCategoryIds: selectedCategory._id }, { role: { $in: ["manager", "admin"] } }] }).select("user name role").populate("user", "name email").lean() : Promise.resolve([]),
  ]);
  const staff = canManage ? staffRows.map((member: any) => ({ id: String(member.user?._id || member.user), name: String(member.user?.name || member.name || "Staff"), role: member.role })) : [{ id: userId, name: String(membership?.name || "Staff"), role }];
  return NextResponse.json({ categories, selectedCategory, items, total, page, pageSize, stats: { pending, inProgress, awaitingResults, completed, overdue }, staff, canManage });
}
