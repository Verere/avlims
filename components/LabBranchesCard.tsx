"use client";
import RemoveBranchesButton from "@/components/RemoveBranchesButton";
import { useState } from "react";

export default function LabBranchesCard({ lab }) {
  const [branchesCount, setBranchesCount] = useState(lab.branches.length);
  const handleRemoved = () => setBranchesCount(0);

  return (
    <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center border border-blue-100">
      <h3 className="text-xl md:text-2xl font-semibold text-blue-800 mb-2">Lab: {lab.name}</h3>
      <div className="text-gray-700 text-base md:text-lg mb-1"><span className="font-medium">Status:</span> {lab.status}</div>

      {/* Always show Create Branch button */}
      <a
        href={`/dashboard/lab/create-branch?labId=${lab._id}`}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-semibold"
      >
        Create Branch
      </a>

      {/* Show branches count and Remove Branches button if branches exist */}
      {branchesCount > 0 && (
        <>
          <div className="text-green-700 mt-2">Branches: {branchesCount}</div>
          <RemoveBranchesButton labId={lab._id.toString()} onRemoved={handleRemoved} />
        </>
      )}
    </div>
  );
}
