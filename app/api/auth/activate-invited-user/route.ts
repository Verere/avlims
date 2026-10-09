import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import LabMembership from "@/models/LabMembership";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });

    await dbConnect();
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
      invitedLabId: { $exists: true },
      invitedBranchId: { $exists: true },
    }).select("name email invitedLabName invitedBranchName invitedRole").lean();

    if (!user) return NextResponse.json({ error: "This invitation is invalid or has expired" }, { status: 400 });

    return NextResponse.json({
      name: user.name,
      email: user.email,
      labName: user.invitedLabName || "",
      branchName: user.invitedBranchName || "",
      role: user.invitedRole || "staff",
    });
  } catch {
    return NextResponse.json({ error: "Unable to validate this invitation" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token || password.length < 6) {
      return NextResponse.json({ error: "A valid invitation and password of at least 6 characters are required" }, { status: 400 });
    }

    await dbConnect();
    const hashedPassword = await hashPassword(password);
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const user = await User.findOne({
          emailVerificationToken: token,
          emailVerificationExpires: { $gt: new Date() },
          invitedLabId: { $exists: true },
          invitedBranchId: { $exists: true },
        }).session(session);

        if (!user || !user.invitedLabId || !user.invitedBranchId || !user.invitedLabSlug) {
          throw new Error("This invitation is invalid or has expired");
        }

        await LabMembership.findOneAndUpdate(
          {
            user: user._id,
            labId: user.invitedLabId,
            branchId: user.invitedBranchId,
          },
          {
            labId: user.invitedLabId,
            branchId: user.invitedBranchId,
            lab: user.invitedLabSlug,
            slug: user.invitedLabSlug,
            branch: user.invitedBranchSlug || user.invitedBranchName || "",
            name: user.invitedLabName || "",
            permissions: Array.isArray(user.invitedPermissions) && user.invitedPermissions.length > 0
              ? user.invitedPermissions
              : ["dashboard:access"],
            status: "active",
            role: user.invitedRole || "staff",
            user: user._id,
            owner: user.invitedBy || user._id,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );

        user.password = hashedPassword;
        user.status = "active";
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.invitedLabId = undefined;
        user.invitedBranchId = undefined;
        user.invitedLabSlug = undefined;
        user.invitedBranchSlug = undefined;
        user.invitedBranchName = undefined;
        user.invitedLabName = undefined;
        user.invitedRole = undefined;
        user.invitedPermissions = undefined;
        user.invitedBy = undefined;
        await user.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to activate account";
    const status = message.includes("invitation is invalid or has expired") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}