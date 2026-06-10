"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPatient } from "@/services/patientService";

export default async function addPatient(form: any) {
  try {
    const patient = await createPatient(form);
    revalidatePath("../patients");
    redirect("../patients");
    return patient;
  } catch (error) {
    console.error("Failed to add patient:", error);
    throw error;
  }
}
