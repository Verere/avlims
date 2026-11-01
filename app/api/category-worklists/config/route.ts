import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Category from "@/models/Category";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";

async function access(req: NextRequest) {
  const userId = String((await getServerSession(authOptions))?.user?.id || "");
  if (!userId) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const labSlug = String(req.nextUrl.searchParams.get("labSlug") || "");
  const branchSlug = String(req.nextUrl.searchParams.get("branchSlug") || "");
  if (!labSlug || !branchSlug) return { response: NextResponse.json({ error: "Lab and branch are required" }, { status: 400 }) };
  await dbConnect();
  const lab = await Lab.findOne({ slug: labSlug }).select("_id owner branches").lean();
  const branch = await Branch.findOne({ $or: [{ slug: branchSlug }, { branch: branchSlug }] }).select("_id slug branch").lean();
  if (!lab || !branch || !(lab as any).branches?.some((id: any) => String(id) === String(branch._id))) return { response: NextResponse.json({ error: "Branch not found" }, { status: 404 }) };
  const owner = String((lab as any).owner) === userId;
  const membership: any = owner ? null : await LabMembership.findOne({ user: userId, labId: lab._id, branchId: branch._id, status: "active" }).select("role permissions worklistCategoryIds name").lean();
  if (!owner && !membership) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const role = owner ? "owner" : String(membership.role || "staff").toLowerCase();
  const canManage = owner || ["admin", "manager"].includes(role) || membership?.permissions?.includes("*");
  if (!canManage && !["technician", "staff"].includes(role)) return { response: NextResponse.json({ error: "You do not have category worklist access" }, { status: 403 }) };
  return { lab, branch, userId, membership, role, canManage };
}

export async function GET(req: NextRequest) {
  const ctx = await access(req);
  if ("response" in ctx) return ctx.response;
  const query: Record<string, any> = { labId: ctx.lab._id, branchId: ctx.branch._id, isCancelled: { $ne: true } };
  if (!ctx.canManage) query._id = { $in: (ctx.membership?.worklistCategoryIds || []).map(String) };
  const [categories, memberships] = await Promise.all([
    Category.find(query).sort({ name: 1 }).select("_id name slug").lean(),
    ctx.canManage ? LabMembership.find({ labId: ctx.lab._id, branchId: ctx.branch._id, status: "active" }).select("_id name role worklistCategoryIds").populate("user", "name email status").sort({ name: 1 }).lean() : Promise.resolve([]),
  ]);
  return NextResponse.json({ categories, memberships, canManage: ctx.canManage });
}

export async function PATCH(req: NextRequest) {
  const ctx = await access(req);
  if ("response" in ctx) return ctx.response;
  if (!ctx.canManage) return NextResponse.json({ error: "Only branch administrators can assign worklist categories" }, { status: 403 });
  try {
    const body = await req.json();
    const membershipId = String(body.membershipId || "");
    const categoryIds: string[] = Array.isArray(body.categoryIds)
      ? [...new Set<string>(body.categoryIds.map((id: unknown) => String(id)))]
      : [];
    if (!mongoose.Types.ObjectId.isValid(membershipId)) return NextResponse.json({ error: "Select a valid staff membership" }, { status: 400 });
    if (categoryIds.some(id => !mongoose.Types.ObjectId.isValid(id))) return NextResponse.json({ error: "One or more categories are invalid" }, { status: 400 });
    const categoryObjectIds = categoryIds.map((id) => new mongoose.Types.ObjectId(id));
    const [member, categories] = await Promise.all([
      LabMembership.findOne({ _id: membershipId, labId: ctx.lab._id, branchId: ctx.branch._id, status: "active" }),
      Category.find({ _id: { $in: categoryObjectIds }, labId: ctx.lab._id, branchId: ctx.branch._id, isCancelled: { $ne: true } }).select("_id").lean(),
    ]);
    if (!member) return NextResponse.json({ error: "Active membership not found in this branch" }, { status: 404 });
    if (categories.length !== categoryIds.length) return NextResponse.json({ error: "Choose only active categories from this branch" }, { status: 400 });
    member.worklistCategoryIds = categoryObjectIds;
    await member.save();
    return NextResponse.json({ membershipId, categoryIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save category access" }, { status: 400 });
  }
}
