"use server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

type ResetPasswordState = {
  success: boolean;
  error: string;
};

export async function resetPasswordAction(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  try {
    const token = String(formData.get("token") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!token || !password || password.length < 6) {
      return {
        success: false,
        error: "Invalid request.",
      };
    }

    await dbConnect();

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (
      !user ||
      !user.passwordResetExpiry ||
      Number.isNaN(new Date(user.passwordResetExpiry).getTime())
    ) {
      return {
        success: false,
        error: "Invalid or expired token.",
      };
    }

    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;

    await user.save();

    return {
      success: true,
      error: "",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      error: "Failed to reset password.",
    };
  }
}