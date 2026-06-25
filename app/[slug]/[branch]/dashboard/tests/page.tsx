"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";

async function fetchBranchBySlug(branch: string) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}



async function fetchTestsByBranchId(branchId: String) {
  try {
    const res = await fetch(`/api/tests?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function softDeleteTest(id: string) {
  try {
    const res = await fetch("/api/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch {
    return { error: "Failed to delete" };
  }
}

const emptyEditForm = {
  id: "",
  name: "",
  code: "",
  category: "",
  subCategory: "",
  price: "",
  type: "lab",
  resultType: "numeric",
  unit: "",
  turnaroundHours: "",
  sampleType: "",
  preparationInstructions: "",
  isActive: true,
};

export default function TestsTablePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(emptyEditForm);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const testsData = await fetchTestsByBranchId(branchDoc._id);
        console.log('Fetched tests:', testsData, branchDoc)
        setTests(testsData);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch tests");
        setTests([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  const handleDelete = async (test: any) => {
    toast.warn(
      <div>
        Delete <b>{test.name}</b>?<br />
        <button
          className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          onClick={async () => {
            toast.dismiss();
            const res = await softDeleteTest(test.id);
            if (res.success) {
              toast.success("Test deleted");
              setTests((prev) => prev.filter((t) => t.id !== test.id));
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

  const openEditModal = (test: any) => {
    setEditForm({
      id: test.id,
      name: test.name || "",
      code: test.code || "",
      category: test.category || "",
      price: test.price ?? "",
      type: test.type || "lab",
      resultType: test.resultType || "numeric",
      unit: test.unit || "",
      turnaroundHours: test.turnaroundHours ?? "",
      sampleType: test.sampleType || "",
      preparationInstructions: test.preparationInstructions || "",
      isActive: test.isActive !== false,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        id: editForm.id,
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        category: editForm.category.trim(),
        price: Number(editForm.price),
        type: editForm.type,
        resultType: editForm.resultType,
        unit: editForm.unit.trim(),
        preparationInstructions: editForm.preparationInstructions.trim(),
        isActive: editForm.isActive,
      };

      if (editForm.turnaroundHours !== "") {
        payload.turnaroundHours = Number(editForm.turnaroundHours);
      }

      const res = await fetch("/api/tests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update test");
      }

      setTests((prev) =>
        prev.map((test) =>
          test.id === editForm.id
            ? {
                ...test,
                ...payload,
              }
            : test
        )
      );
      toast.success("Test updated");
      setIsEditOpen(false);
      setEditForm(emptyEditForm);
    } catch (saveError: any) {
      toast.error(saveError?.message || "Failed to update test");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ToastContainer />
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Tests</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : tests.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No tests found.</td></tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className="border-b group hover:bg-blue-100/60 transition-all">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700">{test.name?.toUpperCase()}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{test.type || "lab"}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-800">{test.category}</td>
                  <td className="px-6 py-4 text-gray-800 font-mono">₦{test.price?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center">
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
                      onClick={() => openEditModal(test)}
                      title="Edit Test"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a1 1 0 01-1.213-1.213l1-4a4 4 0 01.828-1.414z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition"
                      onClick={() => handleDelete(test)}
                      title="Delete Test"
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

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Test</h2>
                <p className="text-sm text-slate-500">Update the details for this test.</p>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200"
                onClick={() => setIsEditOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid gap-4 p-6 md:grid-cols-2">

             
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Name</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>


              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.category}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, category: e.target.value }))}
                  required
                />
              </label>
               <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:gap-6">

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Code</span>
                <input
                  className="rounded-lg border  w-[80px] border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.code}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, code: e.target.value }))}
                />
              </label>

             

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Price</span>
                <input
                  type="number"
                  min="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.price}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Turnaround Hours</span>
                <input
                  type="number"
                  min="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.turnaroundHours}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, turnaroundHours: e.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Type</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="lab">Lab</option>
                  <option value="scan">Scan</option>
                </select>
              </label>
               </div>

              <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:gap-6">


              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Result Type</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  value={editForm.resultType}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, resultType: e.target.value }))}
                  >
                  <option value="numeric">Numeric</option>
                  <option value="qualitative">Qualitative</option>
                  <option value="enumerated">Enumerated</option>
                  <option value="text">Text</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Unit</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.unit}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, unit: e.target.value }))}
                  />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Sample Type</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.sampleType}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, sampleType: e.target.value }))}
                  />
              </label>
                  </div>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Preparation Instructions</span>
                <textarea
                  rows={4}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.preparationInstructions}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, preparationInstructions: e.target.value }))}
                />
              </label>

              <label className="flex items-center gap-3 md:col-span-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active
              </label>

              <div className="flex items-center justify-end gap-3 md:col-span-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
