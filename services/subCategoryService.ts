import { dbConnect } from "@/lib/mongodb";
import SubCategory from "@/models/SubCategory";

export async function createSubCategory(data: any) {
  await dbConnect();
  return SubCategory.create(data);
}

export async function getSubCategories() {
  await dbConnect();
  return SubCategory.find({}).sort({ createdAt: -1 }).lean();
}
