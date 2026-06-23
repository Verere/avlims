import { dbConnect } from "@/lib/mongodb";
import RefClinic from "@/models/RefClinic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createFacilit(data: any) {
  await dbConnect();
  const branchId = data.branchId || data.branch;
  if (!branchId || !data.slug) {
    throw new Error("branchId and slug are required to create a facility");
  }

  const name = String(data?.name || "").trim();
  const address = String(data?.address || "").trim();
  const slug = String(data?.slug || "").trim();

  const duplicate = await RefClinic.findOne({
    branchId,
    isCancelled: false,
    $or: [
      {
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
        address: { $regex: `^${escapeRegex(address)}$`, $options: "i" },
      },
      { slug: { $regex: `^${escapeRegex(slug)}$`, $options: "i" } },
    ],
  }).lean();

  if (duplicate) {
    throw new Error("A ref clinic with the same information already exists for this branch");
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