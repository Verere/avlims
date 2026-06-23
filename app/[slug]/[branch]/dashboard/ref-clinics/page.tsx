"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  const [refClinics, setRefClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClinic, setEditingClinic] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openEditModal = (clinic: any) => {
    setEditingClinic(clinic);
    setEditForm({
      name: clinic.name || "",
      address: clinic.address || "",
      slug: clinic.slug || "",
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingClinic(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic?._id) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ref-clinics/${editingClinic._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address,
          slug: editForm.slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update ref clinic");

      setRefClinics((prev) =>
        prev.map((clinic) => (clinic._id === data._id ? data : clinic))
      );
      setEditingClinic(null);
    } catch (err: any) {
      setError(err?.message || "Failed to update ref clinic");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clinic: any) => {
    if (!clinic?._id) return;

    toast.warn(
      <div>
        Delete <b>{clinic.name}</b>?<br />
        <button
          className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          onClick={async () => {
            toast.dismiss();
            setDeletingId(clinic._id);
            setError(null);
            try {
              const res = await fetch(`/api/ref-clinics/${clinic._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCancelled: true }),
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || "Failed to delete ref clinic");

              setRefClinics((prev) => prev.filter((row) => row._id !== clinic._id));
              toast.success("Ref clinic deleted");
            } catch (err: any) {
              setError(err?.message || "Failed to delete ref clinic");
              toast.error(err?.message || "Failed to delete ref clinic");
            } finally {
              setDeletingId(null);
            }
          }}
        >
          Confirm Delete
        </button>
      </div>,
      { autoClose: false, closeOnClick: false }
    );
  };

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
      <ToastContainer />
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Facility / Clinic</h1>
      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : refClinics.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No ref clinics found.</td></tr>
            ) : (
              refClinics.map((clinic: any) => (
                <tr key={clinic._id} className="border-b hover:bg-blue-100/60 transition-all">
                  <td className="px-6 py-4 text-gray-900 font-semibold group-hover:text-blue-700">{clinic.name?.toUpperCase()}</td>
                  <td className="px-6 py-4 text-gray-800">{clinic.address}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(clinic)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(clinic)}
                        disabled={deletingId === clinic._id}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {deletingId === clinic._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeEditModal}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Ref Clinic</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSaveEdit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  required
                />
              </div>
              <div>
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
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  hidden
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
