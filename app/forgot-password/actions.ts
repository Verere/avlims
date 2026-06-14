"use server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { buildAppUrl, sendMail } from "@/lib/email";
import crypto from "crypto";


type ForgotPasswordState = {
  success: boolean;
  error: string;
};

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  try {
    const email = String(formData.get("email") ?? "");

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return {
        success: false,
        error: "Please enter a valid email address.",
      };
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user) {
      return {
        success: true,
        error: "",
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 1000 * 60 * 60;

    user.passwordResetToken = token;
    user.passwordResetExpiry = tokenExpiry;

    await user.save();

    const resetUrl = buildAppUrl(`/reset-password?token=${token}`);

    await sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p>
      <p>Click the link below to update your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email.</p>`,
    });

    return {
      success: true,
      error: "",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      error: "Failed to send reset email",
    };
  }
}