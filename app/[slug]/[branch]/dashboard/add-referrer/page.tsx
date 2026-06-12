"use client";
import React, { useState, useTransition, useEffect } from "react";
import { usePathname } from "next/navigation";

async function fetchBranchBySlug(branch: any) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
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

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    refClinic: "",
    bank: "",
    account: "",
    email: "",
    slug: slug,
  });
  const [refClinics, setRefClinics] = useState([]);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setRefClinics([]);
      const branchDoc = await fetchBranchBySlug(branch);
      if (branchDoc && branchDoc._id) {
        const clinics = await fetchRefClinicsByBranchId(branchDoc._id);
        setRefClinics(clinics);
      }
    }
    if (branch) fetchData();
  }, [branch]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const res = await fetch("/api/referrers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            branchId: branchDoc._id,
          }),
        });
        if (!res.ok) throw new Error("Failed to add referrer");
        setSuccess(true);
        setForm({ name: "", address: "", phone: "", refClinic: "", bank: "", account: "", email: "", slug: slug });
      } catch (e: any) {
        setError(e?.message || "Failed to add referrer");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 max-w-md mx-auto w-full md:w-96 mt-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Add Referrer</h2>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Ref Clinic</label>
          <select
            name="refClinic"
            value={form.refClinic}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          >
            <option value="">Select a ref clinic</option>
            {refClinics?.map((clinic: any) => (
              <option key={clinic?._id} value={clinic._id}>{clinic.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Bank</label>
          <input
            type="text"
            name="bank"
            value={form.bank}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Account</label>
          <input
            type="text"
            name="account"
            value={form.account}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <input type="hidden" name="slug" value={form.slug} />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Referrer"}
        </button>
        {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mt-2 text-center">Referrer added successfully!</div>}
      </form>
    </div>
  );
}
