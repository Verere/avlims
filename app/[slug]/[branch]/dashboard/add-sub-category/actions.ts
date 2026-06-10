"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSubCategory } from "@/services/subCategoryService";


import { getLabBySlug } from "@/services/labService";
import { getBranchBySlug } from "@/services/branchService";

export default async function addSubCategory(form: any, slug: string, branch: string) {
  try {
    // Fetch lab and branch IDs from backend
    const lab = await getLabBySlug(slug);
    const branchDoc = await getBranchBySlug(branch);

    if (!lab || !branchDoc) throw new Error("Lab or Branch not found");

    const subCategory = await createSubCategory({
      ...form,
      labId: lab._id,
      branchId: branchDoc._id,
    });
    revalidatePath("../sub-categories");
    redirect("../sub-categories");
    return subCategory;
  } catch (error) {
    console.error("Failed to add sub-category:", error);
    throw error;
  }
}
