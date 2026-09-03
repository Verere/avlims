"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";

type ReferrerRow = {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  bank: string;
  account: string;
  refClinic: string | { _id?: string; name?: string };
  refClinicName?: string;
};

type RefClinicOption = {
  _id: string;
  name: string;
};

type EditReferrerForm = {
  name: string;
  address: string;
  phone: string;
  email: string;
  bank: string;
  account: string;
  refClinic: string;
};


async function fetchReferrersByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/referrers?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchRefClinicsByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/ref-clinics?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function softDeleteReferrer(id: string) {
  try {
    const res = await fetch("/api/referrers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch {
    return { error: "Failed to delete" };
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

export default function ReferrersTablePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [refClinics, setRefClinics] = useState<RefClinicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReferrer, setEditingReferrer] = useState<ReferrerRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState<EditReferrerForm>({
    name: "",
    address: "",
    phone: "",
    email: "",
    bank: "",
    account: "",
    refClinic: "",
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredReferrers = referrers.filter((referrer) => {
    if (!normalizedSearchQuery) return true;
    const clinicName = referrer.refClinicName || (
      typeof referrer.refClinic === "object" ? referrer.refClinic?.name : referrer.refClinic
    );
    return [referrer.name, referrer.phone, referrer.email, referrer.address, referrer.bank, referrer.account, clinicName]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
  });

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");

        const [referrerData, clinicData] = await Promise.all([
          fetchReferrersByBranchId(branchDoc._id),
          fetchRefClinicsByBranchId(branchDoc._id),
        ]);
        setReferrers(referrerData || []);
        setRefClinics(clinicData || []);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch referrers");
        setReferrers([]);
        setRefClinics([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  const openEditModal = (ref: ReferrerRow) => {
    setEditingReferrer(ref);
    setEditForm({
      name: ref.name || "",
      address: ref.address || "",
      phone: ref.phone || "",
      email: ref.email || "",
      bank: ref.bank || "",
      account: ref.account || "",
      refClinic: (typeof ref.refClinic === "object" ? ref.refClinic?._id : ref.refClinic) || "",
    });
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingReferrer(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReferrer?._id) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/referrers/${editingReferrer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update referrer");

      const selectedClinic = refClinics.find((c) => c._id === editForm.refClinic);
      setReferrers((prev) =>
        prev.map((item) =>
          item._id === editingReferrer._id
            ? {
                ...item,
                ...data,
                refClinicName: selectedClinic?.name || item.refClinicName || "",
              }
            : item
        )
      );
      setEditingReferrer(null);
      toast.success("Referrer updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update referrer");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (ref: any) => {
    toast.warn(
      <div>
        Delete <b>{ref.name}</b>?<br />
        <button
          className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          onClick={async () => {
            toast.dismiss();
            const res = await softDeleteReferrer(ref._id);
            if (res.success) {
              toast.success("Referrer deleted");
              setReferrers((prev) => prev.filter((r: any) => r._id !== ref._id));
            } else {
              toast.error(res.error || "Failed to delete");
            }
          }}
        >
          Confirm Delete
        </button>
      </div>,
      { autoClose: false, closeOnClick: false }
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <ToastContainer />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Referrers</h1>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search referrers"
          aria-label="Search referrers"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
        />
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Facility</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Email</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Bank</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Account</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : filteredReferrers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No matching referrers found.</td></tr>
            ) : (
              filteredReferrers.map((ref) => (
                <tr key={ref._id} className="border-b hover:bg-blue-100/60 transition-all">
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-900 font-semibold group-hover:text-blue-700 whitespace-nowrap">{ref.name?.toUpperCase()}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.phone}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">
                    {ref.refClinicName || (typeof ref.refClinic === "object" ? ref.refClinic?.name : ref.refClinic)}
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.email}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.bank}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.account}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-center flex gap-2 justify-center">
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
                      onClick={() => openEditModal(ref)}
                      title="Edit Referrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a1 1 0 01-1.213-1.213l1-4a4 4 0 01.828-1.414z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition"
                      onClick={() => handleDelete(ref)}
                      title="Delete Referrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingReferrer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Referrer</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Bank</label>
                <input
                  type="text"
                  value={editForm.bank}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bank: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Account</label>
                <input
                  type="text"
                  value={editForm.account}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, account: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Ref Clinic</label>
                <select
                  value={editForm.refClinic}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, refClinic: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                >
                  <option value="">Select a ref clinic</option>
                  {refClinics.map((clinic) => (
                    <option key={clinic._id} value={clinic._id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 mt-1">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
