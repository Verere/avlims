"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPatient } from "@/services/patientService";
import { createFacilit } from "@/services/facilitySeervice";

export default async function addFacility(form: any) {
  try {
    const facility = await createFacilit(form);
    revalidatePath("../facilities");
    redirect("../facilities");
    return facility;
  } catch (error) {
    console.error("Failed to add Facility:", error);
    throw error;
  }
}
