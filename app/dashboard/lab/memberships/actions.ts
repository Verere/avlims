"use server";
import { dbConnect } from "@/lib/mongodb";
import LabMembership from "@/models/LabMembership";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getUserLabMemberships() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  const memberships = await LabMembership.find({ user: session.user.id }).lean();
  // Convert all ObjectId fields to strings for client safety
  return memberships.map(m => ({
    ...m,
    _id: m._id?.toString?.() ?? m._id,
    labId: m.labId?.toString?.() ?? m.labId,
    branchId: m.branchId?.toString?.() ?? m.branchId,
    user: m.user?.toString?.() ?? m.user,
    owner: m.owner?.toString?.() ?? m.owner,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
    updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
  }));
}
