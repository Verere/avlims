import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";

export async function getBranchBySlug(slug: string) {
  await dbConnect();
  return Branch.findOne({ branch: slug });
}
