import AuditLogPanel from "@/components/AuditLogPanel";
import { getUserLabMemberships } from "@/app/dashboard/lab/memberships/actions";

function toRouteSegment(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default async function AuditTrailPage({
  params,
}: {
  params: Promise<{ slug: string; branch: string }>;
}) {
  const { slug, branch } = await params;
  const memberships = await getUserLabMemberships();
  const branchMemberships = memberships.filter(
    (membership: any) =>
      membership.slug === slug && toRouteSegment(membership.branch) === branch
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <AuditLogPanel memberships={branchMemberships} />
      </div>
    </div>
  );
}