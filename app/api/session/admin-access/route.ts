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
  const [lab, branch] = await Promise.all([
    Lab.findOne({ slug: labSlug }).select("_id owner").lean(),
    Branch.findOne({ $or: [{ slug: branchSlug }, { branch: branchSlug }] }).select("_id").lean(),
  ]);

  if (!lab || !branch) return NextResponse.json({ isAdmin: false }, { status: 200 });
  if (String(lab.owner) === userId) return NextResponse.json({ isAdmin: true }, { status: 200 });

  const membership = await LabMembership.findOne({
    user: userId,
    labId: lab._id,
    branchId: branch._id,
    status: "active",
  }).select("role permissions").lean();

  const role = String(membership?.role || "").toLowerCase();
  const permissions = Array.isArray(membership?.permissions) ? membership.permissions : [];
  const isAdmin = role === "admin" || role === "owner" || permissions.includes("*");

  return NextResponse.json({ isAdmin }, { status: 200 });
}