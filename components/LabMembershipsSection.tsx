"use client";
import LabMembershipsCard from "./LabMembershipsCard";
export default function LabMembershipsSection({ memberships }: { memberships: any[] }) {
  return (
    <div className="w-full max-w-5xl mt-10">
      <h2 className="text-2xl font-bold mb-4">Your Lab Memberships</h2>
      <LabMembershipsCard memberships={memberships} />
    </div>
  );
}
