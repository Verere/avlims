import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";

export async function getBranchBySlug(slug: string) {
  await dbConnect();
  const pattern = new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const branch = await Branch.findOne({
    $or: [{ slug: pattern }, { branch: pattern }],
  });
  return branch;
}
