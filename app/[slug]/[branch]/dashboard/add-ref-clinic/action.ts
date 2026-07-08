"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createFacilit } from "@/services/facilitySeervice";

type AddFacilityResult = {
  ok: false;
  message: string;
};

export default async function addFacility(form: any) {
  try {
    await createFacilit(form);
  } catch (error) {
    console.error("Failed to add Facility:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to add ref clinic. Please try again.",
    } satisfies AddFacilityResult;
  }

  const slug = String(form?.slug || "").trim();
  const branchSlug = String(form?.branchSlug || "").trim();
  const facilitiesPath =
    slug && branchSlug
      ? `/${slug}/${branchSlug}/dashboard/facilities`
      : "/dashboard/facilities";

  revalidatePath(facilitiesPath);
  redirect(facilitiesPath);
}
