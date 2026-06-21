import { dbConnect } from "@/lib/mongodb";
import RefClinic from "@/models/RefClinic";

export async function createFacilit(data: any) {
  await dbConnect();
  const branchId = data.branchId || data.branch;
  if (!branchId || !data.slug) {
    throw new Error("branchId and slug are required to create a facility");
  }

  const payload = {
    ...data,
    branchId,
  };

  const facility = await RefClinic.create(payload);
  return facility;
}

export async function getFacilities(branchId?: string) {
  await dbConnect();
  const filter: any = { isCancelled: false };
  if (branchId) filter.branchId = branchId;
  return RefClinic.find(filter).sort({ createdAt: -1 }).lean();
}