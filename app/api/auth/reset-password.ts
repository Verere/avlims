import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import LabMembership from "@/models/LabMembership";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    await dbConnect();
    const user = await User.findOne({
      passwordResetToken: normalizedToken,
      passwordResetExpiry: { $gt: new Date() },
    });
    if (!user || !user.passwordResetExpiry || Number.isNaN(new Date(user.passwordResetExpiry).getTime())) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    if (user.invitedLabId && user.invitedBranchId && user.invitedLabSlug && user.invitedBranchName && user.invitedLabName) {
      const existingMembership = await LabMembership.findOne({
        user: user._id,
        labId: user.invitedLabId,
        branchId: user.invitedBranchId,
      });

      if (!existingMembership) {
        await LabMembership.create({
          labId: user.invitedLabId,
          branchId: user.invitedBranchId,
          lab: user.invitedLabSlug,
          branch: user.invitedBranchName,
          name: user.invitedLabName,
          permissions: Array.isArray(user.invitedPermissions) ? user.invitedPermissions : ["dashboard:access"],
          status: "active",
          role: user.invitedRole || "staff",
          user: user._id,
          owner: user.invitedBy,
        });
      }
    }

    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.invitedLabId = undefined;
    user.invitedBranchId = undefined;
    user.invitedLabSlug = undefined;
    user.invitedBranchName = undefined;
    user.invitedLabName = undefined;
    user.invitedRole = undefined;
    user.invitedPermissions = undefined;
    user.invitedBy = undefined;
    await user.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
