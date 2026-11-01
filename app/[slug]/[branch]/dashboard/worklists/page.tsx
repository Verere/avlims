import CategoryWorklistsWorkspace from "@/components/CategoryWorklistsWorkspace";

export default async function WorklistsPage({ params }: { params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch } = await params;
  return <CategoryWorklistsWorkspace labSlug={slug} branchSlug={branch} />;
}
