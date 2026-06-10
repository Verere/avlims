"use server";

import { dbConnect } from "@/lib/mongodb";
import Lab from "@/models/Lab";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function createLabAction(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) {
    return { error: "You must be signed in to create a lab." };
  }
  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 50);
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { error: "Lab name is required." };
    }
    await dbConnect();
    const existing = await Lab.findOne({ name });
    if (existing) {
      return { error: "A lab with this name already exists." };
    }



    // Generate unique slug, fallback to random if empty
    let baseSlug = slugify(name);
    if (!baseSlug) {
      baseSlug = Math.random().toString(36).substring(2, 10);
    }
    let slug = baseSlug;
    let counter = 1;
    while (await Lab.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Guard: Prevent creation if slug is still null/empty
    if (!slug) {
      console.error("Lab creation aborted: slug is null or empty", { name, slug });
      return { error: "Failed to generate a unique lab slug. Please try again." };
    }
    console.log("Creating lab with slug:", slug);

    // Pass user.id as string, let Mongoose cast to ObjectId
    await Lab.create({ name, slug, owner: user.id });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to create lab." };
  }
}
