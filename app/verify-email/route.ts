import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import LabMembership from "@/models/LabMembership";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const base = req.nextUrl.origin;

    if (!token) {
      return NextResponse.redirect(new URL("/login?verified=missing", base));
    }

    await dbConnect();

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/login?verified=invalid", base));
    }

    if (!user.emailVerified && user.invitedLabId && user.invitedBranchId) {
      return NextResponse.redirect(new URL(`/activate-account?token=${encodeURIComponent(token)}`, base));
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    if (user.invitedLabId && user.invitedBranchId) {
      await LabMembership.findOneAndUpdate(
        {
          user: user._id,
          labId: user.invitedLabId,
          branchId: user.invitedBranchId,
        },
        {
          labId: user.invitedLabId,
          branchId: user.invitedBranchId,
          lab: user.invitedLabSlug || "",
          slug: user.invitedLabSlug || "",
          branch: user.invitedBranchSlug || user.invitedBranchName || "",
          name: user.name,
          permissions:
            Array.isArray(user.invitedPermissions) && user.invitedPermissions.length > 0
              ? user.invitedPermissions
              : ["dashboard:access"],
          status: "active",
          role: user.invitedRole || "staff",
          user: user._id,
          owner: user.invitedBy || user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      user.status = "active";
      user.invitedLabId = undefined;
      user.invitedBranchId = undefined;
      user.invitedLabSlug = undefined;
      user.invitedBranchSlug = undefined;
      user.invitedBranchName = undefined;
      user.invitedLabName = undefined;
      user.invitedRole = undefined;
      user.invitedPermissions = undefined;
      user.invitedBy = undefined;
      await user.save();
    }

    return NextResponse.redirect(new URL("/login?verified=success", base));
  } catch {
    return NextResponse.redirect(new URL("/login?verified=error", req.nextUrl.origin));
  }
}
