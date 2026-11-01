import SpecimenReceptionWorkspace from "@/components/SpecimenReceptionWorkspace";

export default async function SpecimenReceptionPage({ params }: { params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch } = await params;
  return <SpecimenReceptionWorkspace labSlug={slug} branchSlug={branch} />;
}
