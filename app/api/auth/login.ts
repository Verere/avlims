import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { comparePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
  }
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
  }
  // In a real app, set a secure cookie or JWT here
  return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
}
