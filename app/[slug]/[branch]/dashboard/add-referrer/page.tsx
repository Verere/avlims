"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ReferrerForm from "@/components/ReferrerForm/ReferrerForm";
import addReferrer from "./action";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

async function fetchBranchBySlug(branch: any) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLabBySlug(slug: string) {
  try {
    const res = await fetch(`/api/labs/${slug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRefClinicsByBranchId(branchId: any) {
  try {
    const res = await fetch(`/api/ref-clinics?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}



export default function AddReferrerPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [refClinics, setRefClinics] = useState<Array<{ _id: string; name: string }>>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [clinicsError, setClinicsError] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    async function loadRefClinics() {
      setClinicsLoading(true);
      setClinicsError("");
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (branchDoc && branchDoc._id) {
          const clinics = await fetchRefClinicsByBranchId(branchDoc._id);
          setRefClinics(clinics);
        } else {
          setRefClinics([]);
          setClinicsError("Branch not found.");
        }
      } catch {
        setRefClinics([]);
        setClinicsError("Failed to load ref clinics.");
      } finally {
        setClinicsLoading(false);
      }
    }
    loadRefClinics();
  }, [branch]);


 const handleSubmit = async (data: any) => {
      setLoading(true);
      console.log("Submitting referrer data:", data);
      try {
        const [branchDoc, labDoc] = await Promise.all([
          fetchBranchBySlug(branch),
          fetchLabBySlug(slug),
        ]);
        if (!branchDoc || !branchDoc._id || !labDoc || !labDoc._id) throw new Error("Branch or Lab not found");

        await addReferrer({
          ...data,
          branchId: branchDoc._id,
          branch: branchDoc.branch,
          labId: labDoc._id,
          slug,
        });
        toast.success("Referrer added successfully");
      } catch (error: any) {
        toast.error(error?.message || "A referrer with the same information already exists");
      } finally {
        setLoading(false);
      }
    };
  


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <ToastContainer />
      {clinicsError && <div className="mb-4 text-sm text-red-600">{clinicsError}</div>}
      {clinicsLoading && <div className="mb-4 text-sm text-gray-600">Loading ref clinics...</div>}
      <ReferrerForm
        refClinics={refClinics}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
