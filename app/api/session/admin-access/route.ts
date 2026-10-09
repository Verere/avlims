import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ isAdmin: false }, { status: 200 });

  const labSlug = String(request.nextUrl.searchParams.get("labSlug") || "").trim();
  const branchSlug = String(request.nextUrl.searchParams.get("branchSlug") || "").trim();
  if (!labSlug || !branchSlug) return NextResponse.json({ isAdmin: false }, { status: 200 });

  await dbConnect();
  const lab = await Lab.findOne({ slug: labSlug }).select("_id owner branches").lean();
  if (!lab) return NextResponse.json({ isAdmin: false }, { status: 200 });

  const memberships = await LabMembership.find({
    user: userId,
    status: "active",
    $or: [{ labId: lab._id }, { lab: labSlug }, { slug: labSlug }],
  }).select("branchId branch role permissions").lean();

  const branchIds = [
    ...(lab.branches || []),
    ...memberships.map((membership) => membership.branchId),
  ];
  const branch = await Branch.findOne({
    _id: { $in: branchIds },
    $or: [{ slug: branchSlug }, { branch: branchSlug }],
  }).select("_id branch").lean();

  if (!branch) return NextResponse.json({ isAdmin: false }, { status: 200 });
  if (String(lab.owner) === userId) return NextResponse.json({ isAdmin: true }, { status: 200 });

  const normalizedBranchNames = [branchSlug, String(branch.branch || "")]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = memberships.some((membership) => {
      const role = String(membership.role || "").trim().toLowerCase();
      const permissions = Array.isArray(membership.permissions) ? membership.permissions : [];
      const hasAdminRole = role === "admin" || role === "owner" || permissions.includes("*");
      const matchesBranchId = String(membership.branchId) === String(branch._id);
      const matchesBranchName = normalizedBranchNames.includes(String(membership.branch || "").trim().toLowerCase());
      return hasAdminRole && (matchesBranchId || matchesBranchName);
    });

  return NextResponse.json({ isAdmin }, { status: 200 });
}