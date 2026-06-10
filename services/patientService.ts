import { dbConnect } from "@/lib/mongodb";
import Patient from "@/models/patient";

export async function createPatient(data: any) {
  await dbConnect();
  if (!data.labId || !data.branch || !data.slug) {
    throw new Error("labId, branch, and slug are required to create a patient");
  }
  const patient = await Patient.create(data);
  return patient;
}

export async function getPatients(branchId?: string) {
  await dbConnect();
  const filter: any = { isCancelled: false };
  if (branchId) filter.branch = branchId;
  return Patient.find(filter).sort({ createdAt: -1 }).lean();
}
