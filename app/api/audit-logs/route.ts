import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";
import Branch from "@/models/Branch";
import Order from "@/models/Order";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labId = request.nextUrl.searchParams.get("labId");
  const branchId = request.nextUrl.searchParams.get("branchId");
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 50), 1), 200);
  const includeCancelledOrders = request.nextUrl.searchParams.get("includeCancelledOrders") === "true";

  if (!labId) {
    return NextResponse.json({ error: "labId is required" }, { status: 400 });
  }

  await dbConnect();
  const [membership, ownedLab] = await Promise.all([
    LabMembership.findOne({ user: session.user.id, labId, status: "active", ...(branchId ? { branchId } : {}) })
      .select("lab slug branch")
      .lean(),
    Lab.exists({ _id: labId, owner: session.user.id }),
  ]);

  if (!membership && !ownedLab) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = { labId, ...(branchId ? { branchId } : {}) };
  const events = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  if (!includeCancelledOrders) return NextResponse.json(events);

  const lab = await Lab.findById(labId).select("slug").lean();
  const branch = branchId ? await Branch.findById(branchId).select("slug branch").lean() : null;
  const branchValues = [branch?.slug, branch?.branch, membership?.branch]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const cancelledOrders = lab?.slug && branchId && branchValues.length
    ? await Order.find({
        isCancelled: true,
        slug: lab.slug,
        $or: [
          { branchId },
          { branch: { $in: branchValues } },
        ],
      })
        .sort({ cancelledAt: -1, createdAt: -1 })
        .lean()
    : [];
  return NextResponse.json({ events, cancelledOrders });
}