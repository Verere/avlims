"use server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});



export const signupAction = async (prevState: any, formData: any) => {
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
      return { error: parsed.error.issues[0].message };
    }

    await dbConnect();
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return { error: "Email already registered" };
    }
    const hashed = await hashPassword(parsed.data.password);
    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      status: "active",
      emailVerified: false,
    });
    return { success: true };
  } catch (err) {
    console.log(err);
    return { error: 'Failed to create user' };
  }
};