"use server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function resetPasswordAction(prevState: any, formData: FormData) {
  try {
    const token = String(formData.get("token") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!token || !password || password.length < 6) {
      return { error: "Invalid request." };
    }
    await dbConnect();
    const user = await User.findOne({ passwordResetToken: token });
    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
      return { error: "Invalid or expired token." };
    }
    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to reset password." };
  }
}
