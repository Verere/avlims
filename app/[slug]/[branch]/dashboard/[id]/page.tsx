import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string;
    branch: string;
    id: string;
  }>;
};

export default async function DashboardOrderAliasPage({ params }: Props) {
  const { slug, branch, id } = await params;
  redirect(`/${slug}/${branch}/dashboard/test-orders/${id}`);
}
