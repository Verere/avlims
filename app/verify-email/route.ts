import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

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

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return NextResponse.redirect(new URL("/login?verified=success", base));
  } catch {
    return NextResponse.redirect(new URL("/login?verified=error", req.nextUrl.origin));
  }
}
