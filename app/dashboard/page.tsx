import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";

import LabMembership from "@/models/LabMembership";
import Lab from "@/models/Lab";


import LabBranchesCard from "@/components/LabBranchesCard";
import LabMembershipsSection from "@/components/LabMembershipsSection";
import AuditLogPanel from "@/components/AuditLogPanel";
import { getUserLabMemberships } from "./lab/memberships/actions";


export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  let labMembership = null;
  let labs = [];
  let memberships = [];
  if (user) {
    await dbConnect();
    // Find all memberships for the user
    memberships = await (await import("./lab/memberships/actions")).getUserLabMemberships();
    labMembership = await LabMembership.findOne({ user: user.id });
    let ownerId = null;
    if (labMembership) {
      ownerId = labMembership.owner || user.id;
      labs = await Lab.find({ owner: ownerId });
      if (!labs.length) {
        labs = await Lab.find({ owner: user.id });
      }
    } else {
      labs = await Lab.find({ owner: user.id });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 md:px-6 flex flex-col gap-6 items-center w-full">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center border border-blue-100">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">Welcome, {user?.name || "User"}!</h2>
          <p className="text-gray-600 text-base md:text-lg">We're glad to see you back. Manage your lab operations efficiently from your dashboard.</p>
        </div>
        {/* Labs List or Create Lab Button */}
        {labs && labs.length > 0 ? (
          labs.map((lab) => {
            const plainLab = {
              ...lab.toObject(),
              _id: lab._id.toString(),
              owner: lab.owner?.toString?.() ?? lab.owner,
              branches: Array.isArray(lab.branches) ? lab.branches.map((b: any) => b?.toString?.() ?? b) : [],
              createdAt: lab.createdAt?.toISOString?.() ?? lab.createdAt,
              updatedAt: lab.updatedAt?.toISOString?.() ?? lab.updatedAt,
            };
            return <LabBranchesCard key={plainLab._id} lab={plainLab} />;
          })
        ) : (
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-600 text-base md:text-lg mb-4">You are not a member of any lab yet.</p>
            <a href="/dashboard/create-lab" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-semibold">Create Lab</a>
          </div>
        )}
      </div>
      {/* Lab Memberships Card Section */}
      <LabMembershipsSection memberships={memberships} />
    </div>
  );
}
