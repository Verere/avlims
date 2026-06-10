"use client";
import React, { useState } from "react";
import PatientForm from "@/components/PatientForm/PatientForm";
import addPatient from "./actions";
import { usePathname } from "next/navigation";

async function fetchBranchBySlug(branch) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLabBySlug(lab) {
  try {
    const res = await fetch(`/api/labs/${lab}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function AddPatientPage() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Fetch branch and lab info
      const branchDoc = await fetchBranchBySlug(branch);
      const labDoc = await fetchLabBySlug(slug);
      if (!branchDoc || !branchDoc._id || !labDoc || !labDoc._id) throw new Error("Branch or Lab not found");
      await addPatient({
        ...data,
        branch: branchDoc._id,
        labId: labDoc._id,
        slug,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <PatientForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
