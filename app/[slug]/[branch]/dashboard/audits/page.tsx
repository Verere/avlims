import AuditLogPanel from "@/components/AuditLogPanel";
import { getUserLabMemberships } from "@/app/dashboard/lab/memberships/actions";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Lab from "@/models/Lab";

type AuditMembership = {
  _id: string;
  labId: string;
  branchId: string;
  lab?: string;
  slug?: string;
  branch?: string;
  status?: string;
};

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
  await dbConnect();
  const memberships = await getUserLabMemberships() as AuditMembership[];
  const lab = await Lab.findOne({ slug }).select("_id branches").lean();
  const labMemberships = lab
    ? memberships.filter((membership) =>
        membership.status === "active" &&
        (String(membership.labId) === String(lab._id) ||
          membership.lab === slug ||
          membership.slug === slug)
      )
    : [];
  const branchIds = [
    ...(lab?.branches || []),
    ...labMemberships.map((membership) => membership.branchId),
  ];
  const branches = branchIds.length
    ? await Branch.find({ _id: { $in: branchIds } }).select("_id slug branch").lean()
    : [];
  const routeBranch = branches.find(
    (candidate) =>
      toRouteSegment(candidate.branch) === branch ||
      toRouteSegment(candidate.slug) === branch
  );
  const branchMemberships = routeBranch
    ? labMemberships.filter((membership) =>
        String(membership.branchId) === String(routeBranch._id)
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Audit Trail</h1>
        {branchMemberships.length > 0 ? (
          <AuditLogPanel memberships={branchMemberships} />
        ) : (
          <p className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No active membership was found for this lab and branch, so audit records cannot be displayed.
          </p>
        )}
      </div>
    </div>
  );
}