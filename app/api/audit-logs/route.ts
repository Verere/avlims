import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labId = request.nextUrl.searchParams.get("labId");
  const branchId = request.nextUrl.searchParams.get("branchId");
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 50), 1), 200);

  if (!labId) {
    return NextResponse.json({ error: "labId is required" }, { status: 400 });
  }

  await dbConnect();
  const [membership, ownedLab] = await Promise.all([
    LabMembership.exists({ user: session.user.id, labId, status: "active", ...(branchId ? { branchId } : {}) }),
    Lab.exists({ _id: labId, owner: session.user.id }),
  ]);

  if (!membership && !ownedLab) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = { labId, ...(branchId ? { branchId } : {}) };
  const events = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return NextResponse.json(events);
}