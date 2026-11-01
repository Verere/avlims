import CategoryWorklistResultEntry from "@/components/CategoryWorklistResultEntry";

export default async function CategoryWorklistResultPage({ params }: { params: Promise<{ slug: string; branch: string; id: string }> }) {
  const { slug, branch, id } = await params;
  return <CategoryWorklistResultEntry labSlug={slug} branchSlug={branch} itemId={id} />;
}
