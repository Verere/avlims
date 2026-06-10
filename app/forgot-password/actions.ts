"use server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { sendMail } from "@/lib/email";
import crypto from "crypto";

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  try {
    const email = String(formData.get("email") ?? "");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { error: "Please enter a valid email address." };
    }
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user) {
      // For security, do not reveal if user exists
      return { success: true };
    }
    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour
    user.passwordResetToken = token;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();
    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to send reset email" };
  }
}
