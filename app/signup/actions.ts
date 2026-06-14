"use server";
import crypto from "crypto";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export type AuthState = {
  success: boolean;
  error: string;
};

export const signupAction = async (prevState: AuthState, formData: any): Promise<AuthState> => {
  try {
    // Log the raw formData object
    console.log('Raw formData:', formData);
    let name = "", email = "", password = "";

    if (formData && typeof formData.get === "function") {
      // Log all keys and values in FormData
      const keys = Array.from(formData.keys());
      for (const key of keys) {
        console.log(`FormData[${key}]:`, formData.get(key));
      }
      name = String(formData.get("name") ?? "");
      email = String(formData.get("email") ?? "");
      password = String(formData.get("password") ?? "");
    } else if (formData) {
      name = String(formData.name ?? "");
      email = String(formData.email ?? "");
      password = String(formData.password ?? "");
    }

      // Validate input
    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await dbConnect();
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return { success: false, error: "Email already registered" };
    }
    const hashed = await hashPassword(parsed.data.password);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      status: "active",
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    try {
      await sendVerificationEmail({ to: parsed.data.email, token: emailVerificationToken });
    } catch (emailErr) {
      console.error("Verification email failed to send:", emailErr);
      // User created — don't block signup over email delivery failure
    }

    return { success: true, error: ""};
  } catch (err) {
    return { success: false, error: 'Failed to create user' };
  }
};