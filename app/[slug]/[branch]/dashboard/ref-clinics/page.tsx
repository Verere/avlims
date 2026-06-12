"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

async function fetchRefClinicsByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/ref-clinics?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchBranchBySlug(branch: string) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function RefClinicsTablePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [refClinics, setRefClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const clinics = await fetchRefClinicsByBranchId(branchDoc._id);
        setRefClinics(clinics);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch ref clinics");
        setRefClinics([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Ref Clinics</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Slug</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : refClinics.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No ref clinics found.</td></tr>
            ) : (
              refClinics.map((clinic: any) => (
                <tr key={clinic._id} className="border-b hover:bg-blue-100/60 transition-all">
                  <td className="px-6 py-4 text-gray-900 font-semibold group-hover:text-blue-700">{clinic.name?.toUpperCase()}</td>
                  <td className="px-6 py-4 text-gray-800">{clinic.address}</td>
                  <td className="px-6 py-4 text-gray-800">{clinic.slug}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
