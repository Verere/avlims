import SampleCollectionWorkspace from "@/components/SampleCollectionWorkspace";

export default async function SampleCollectionPage({ params }: { params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch } = await params;
  return <SampleCollectionWorkspace labSlug={slug} branchSlug={branch} />;
}
