"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReferrer } from "@/services/referralService";

export default async function addReferrer(form: any) {
  try {
    const referrer = await createReferrer(form);
    revalidatePath("../referrers");
    redirect("../referrers");
    return referrer;
  } catch (error) {
    console.error("Failed to add referrer:", error);
    throw error;
  }
}
