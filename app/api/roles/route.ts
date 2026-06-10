import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import LabMembership from "@/models/LabMembership";
import Branch from "@/models/Branch";

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const labSlug = req.nextUrl.searchParams.get("labSlug");
    const branchSlug = req.nextUrl.searchParams.get("branchSlug");
  console.log("Fetching roles with query:", branchSlug);


    if (!labSlug || !branchSlug) {
      return NextResponse.json({ error: "labSlug and branchSlug are required" }, { status: 400 });
    }

    // const branchDoc = await Branch.findOne({
    //   $or: [
    //     { branch: branchSlug },
    //     { slug: branchSlug },
    //   ],
    // }).lean();
    // if (!branchDoc) {
    //   return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    // }

    const memberships = await LabMembership.find({
      lab: labSlug,
      branch: branchSlug,
    })
      .populate("user", "name email status")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(memberships, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch roles" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const { membershipId, role } = await req.json();

    if (!membershipId || !role) {
      return NextResponse.json({ error: "membershipId and role are required" }, { status: 400 });
    }

    const membership = await LabMembership.findByIdAndUpdate(
      membershipId,
      { role: String(role).trim().toLowerCase() },
      { new: true }
    ).populate("user", "name email status");

    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    return NextResponse.json(membership, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update role" }, { status: 400 });
  }
}
