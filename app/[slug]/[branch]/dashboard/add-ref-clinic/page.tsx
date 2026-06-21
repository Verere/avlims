"use client";
import React, { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import RefClinicForm from "@/components/RefClinicForm/RefClinicForm";
import addFacility from "./action";

async function fetchBranchBySlug(branch: any) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// async function createRefClinic(data: any) {
//   const res = await fetch("/api/ref-clinics", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(data),
//   });
//   if (!res.ok) throw new Error("Failed to add ref-clinic");
//   return await res.json();
// }

export default function AddRefClinicPage() {
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
        if (!branchDoc || !branchDoc._id ) throw new Error("Branch or Lab not found");
        await addFacility({
          ...data,
          branchId: branchDoc._id,
          branch: branchDoc._id,
          slug,
        });
      } finally {
        setLoading(false);
      }
    };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
     <RefClinicForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
