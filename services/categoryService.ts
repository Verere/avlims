import { dbConnect } from "@/lib/mongodb";
import Category from "@/models/Category";

export async function getCategories() {
  await dbConnect();
  return Category.find({}).sort({ name: 1 }).lean();
}

// Create a new test category
export async function createTestCategory(data: { name: string; slug: string; labId: string; branchId: string }) {
  await dbConnect();
  // Generate slug from name (simple kebab-case)
  const category = await Category.create({
    name: data.name,
    slug: data.slug,
    labId: data.labId,
    branchId: data.branchId,
  });
  return category;
}
