import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { buildAppUrl, sendMail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    console.log('fg')
  try {
    const body = await req.json();
    console.log('Forgot password request body:', body);
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user) {
      // For security, do not reveal if user exists
      return NextResponse.json({ success: true });
    }
    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour
    user.passwordResetToken = token;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();
    // Send email
    const resetUrl = buildAppUrl(`/reset-password?token=${token}`);
    await sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
