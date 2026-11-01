"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";

async function fetchBranchBySlug(branch: string) {
  try {
    const res = await fetch(`/api/branches/${branch}`, { cache: "no-store" });
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
  reportTemplateRef: "",
  price: "",
  type: "lab",
  resultType: "numeric",
  unit: "",
  turnaroundHours: "",
  preparationInstructions: "",
  requires_specimen_collection: false,
  specimen_type: "",
  container_type: "",
  collection_method: "",
  collection_instructions: "",
  collection_priority: "routine",
  collection_config_status: "needs_review",
  referenceRanges: [] as any[],
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
  const [searchQuery, setSearchQuery] = useState("");
  const [specimenConfigurationAllowed, setSpecimenConfigurationAllowed] = useState(false);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const collectionReviewCount = tests.filter((test) => (test.collection_config_status || "needs_review") === "needs_review").length;
  const filteredTests = tests.filter((test) => {
    if (!normalizedSearchQuery) return true;
    return [
      test.name,
      test.code,
      test.category,
      test.subCategory,
      test.type,
      test.resultType,
      test.sampleType,
      test.collection_config_status,
      test.specimen_type,
      test.unit,
      test.price,
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
  });


  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const settingsRes = await fetch(
          `/api/transaction-id-settings?labSlug=${encodeURIComponent(slug)}&branchSlug=${encodeURIComponent(branch)}`,
          { cache: "no-store" }
        );
        const settings = settingsRes.ok ? await settingsRes.json() : null;
        setSpecimenConfigurationAllowed(
          settings?.allowSpecimenConfiguration === true || branchDoc.allowSpecimenConfiguration === true
        );
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
  }, [branch, slug]);

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
      subCategory: test.subCategory || "",
      reportTemplateRef: test.reportTemplateRef || "",
      price: test.price ?? "",
      type: String(test.type || "lab").trim().toLowerCase(),
      resultType: test.resultType || "numeric",
      unit: test.unit || "",
      turnaroundHours: test.turnaroundHours ?? "",
      preparationInstructions: test.preparationInstructions || "",
      requires_specimen_collection: test.requires_specimen_collection === true,
      specimen_type: test.specimen_type || "",
      container_type: test.container_type || "",
      collection_method: test.collection_method || "",
      collection_instructions: test.collection_instructions || "",
      collection_priority: test.collection_priority || "routine",
      collection_config_status: test.collection_config_status || "needs_review",
      referenceRanges: Array.isArray(test.referenceRanges) && test.referenceRanges.length > 0 ? test.referenceRanges.map((range: any) => ({
        label: range.label || "",
        gender: range.gender || "all",
        ageGroup: range.ageGroup || "all",
        ageMinYears: range.ageMinYears ?? "",
        ageMaxYears: range.ageMaxYears ?? "",
        low: range.low ?? "",
        high: range.high ?? "",
        criticalLow: range.criticalLow ?? "",
        criticalHigh: range.criticalHigh ?? "",
        unit: range.unit || "",
      })) : [{
        label: "",
        gender: "all",
        ageGroup: "all",
        ageMinYears: "",
        ageMaxYears: "",
        low: "",
        high: "",
        criticalLow: "",
        criticalHigh: "",
        unit: "",
      }],
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
        subCategory: editForm.subCategory.trim(),
        price: Number(editForm.price),
        type: editForm.type,
        resultType: editForm.resultType,
        unit: editForm.unit.trim(),
        isActive: editForm.isActive,
      };

      if (specimenConfigurationAllowed) {
        payload.preparationInstructions = editForm.preparationInstructions.trim();
        payload.requires_specimen_collection = editForm.requires_specimen_collection;
        payload.specimen_type = editForm.specimen_type.trim();
        payload.container_type = editForm.container_type.trim();
        payload.collection_method = editForm.collection_method.trim();
        payload.collection_instructions = editForm.collection_instructions.trim();
        payload.collection_priority = editForm.collection_priority;
        payload.collection_config_status = editForm.collection_config_status;
        payload.referenceRanges = editForm.referenceRanges.map((range: any) => ({
            ...range,
            ageMinYears: range.ageMinYears === "" ? undefined : Number(range.ageMinYears),
            ageMaxYears: range.ageMaxYears === "" ? undefined : Number(range.ageMaxYears),
            low: range.low === "" ? undefined : Number(range.low),
            high: range.high === "" ? undefined : Number(range.high),
            criticalLow: range.criticalLow === "" ? undefined : Number(range.criticalLow),
            criticalHigh: range.criticalHigh === "" ? undefined : Number(range.criticalHigh),
            unit: range.unit || editForm.unit.trim() || undefined,
          })).filter((range: any) => range.label || range.low !== undefined || range.high !== undefined || range.criticalLow !== undefined || range.criticalHigh !== undefined || range.ageMinYears !== undefined || range.ageMaxYears !== undefined);
      }

      if (specimenConfigurationAllowed && editForm.turnaroundHours !== "") {
        payload.turnaroundHours = Number(editForm.turnaroundHours);
      }
      if (editForm.type === "scan") payload.reportTemplateRef = editForm.reportTemplateRef.trim();

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
    <div className="mx-auto min-h-screen w-full max-w-6xl bg-slate-50 p-3 sm:p-5 lg:p-8">
      <ToastContainer />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tests</h1>
          <p className="mt-1 text-sm text-slate-500">Manage test details and collection requirements.</p>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search tests"
          aria-label="Search tests"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:max-w-xs"
        />
      </div>
      {collectionReviewCount > 0 ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{collectionReviewCount} test{collectionReviewCount === 1 ? "" : "s"} need collection configuration review. Edit each test and confirm whether specimen collection is required.</p> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Collection setup</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : filteredTests.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No matching tests found.</td></tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test.id} className="border-b group hover:bg-blue-100/60 transition-all">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700">{test.name?.toUpperCase()}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{test.type || "lab"}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-800">{test.category}</td>
                  <td className="px-6 py-4 text-gray-800 font-mono">₦{test.price?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{test.collection_config_status === "configured" ? (test.requires_specimen_collection ? "Collection required" : "No collection") : <span className="font-semibold text-amber-700">Needs review</span>}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
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
                      className="inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                      onClick={() => handleDelete(test)}
                      title="Delete Test"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-test-title">
          <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
              <div>
                <h2 id="edit-test-title" className="text-lg font-bold text-slate-900 sm:text-xl">Edit Test</h2>
                <p className="text-sm text-slate-500">Update the details for this test.</p>
              </div>
              <button
                type="button"
                aria-label="Close edit test dialog"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
                onClick={() => setIsEditOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid min-h-0 gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-2">

              {specimenConfigurationAllowed && <section id="specimen-collection-settings" className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:col-span-2 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Collection setup</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">Specimen collection requirements</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Set how this test’s specimen is collected and handled.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Configuration status
                    <select value={editForm.collection_config_status} onChange={(e) => setEditForm((prev: any) => ({ ...prev, collection_config_status: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="needs_review">Needs review</option><option value="configured">Configured</option></select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Collection requirement
                    <select value={editForm.requires_specimen_collection ? "yes" : "no"} onChange={(e) => setEditForm((prev: any) => ({ ...prev, requires_specimen_collection: e.target.value === "yes" }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="no">No specimen collection</option><option value="yes">Specimen collection required</option></select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Specimen type
                    <input list="edit-specimen-types" value={editForm.specimen_type} onChange={(e) => setEditForm((prev: any) => ({ ...prev, specimen_type: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Select or enter type" />
                    <datalist id="edit-specimen-types">{["Blood", "Serum", "Plasma", "Urine", "Stool", "Sputum", "Swab", "Tissue", "Semen"].map((value) => <option key={value} value={value} />)}</datalist>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Container type<input value={editForm.container_type} onChange={(e) => setEditForm((prev: any) => ({ ...prev, container_type: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="EDTA tube, plain tube, sterile container..." /></label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Collection method<input value={editForm.collection_method} onChange={(e) => setEditForm((prev: any) => ({ ...prev, collection_method: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Venipuncture, urine collection..." /></label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">Collection priority
                    <select value={editForm.collection_priority} onChange={(e) => setEditForm((prev: any) => ({ ...prev, collection_priority: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option><option value="other">Other</option></select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">Collection and handling instructions
                    <textarea rows={3} value={editForm.collection_instructions} onChange={(e) => setEditForm((prev: any) => ({ ...prev, collection_instructions: e.target.value }))} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Collection, transport, and handling instructions" />
                  </label>
                </div>
              </section>}

             
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
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Subcategory</span>
                <input className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" value={editForm.subCategory} onChange={(e) => setEditForm((prev: any) => ({ ...prev, subCategory: e.target.value }))} />
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

              {specimenConfigurationAllowed && <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Turnaround Hours</span>
                <input
                  type="number"
                  min="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.turnaroundHours}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, turnaroundHours: e.target.value }))}
                />
              </label>}

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
              {editForm.type === "scan" && <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Report Template Reference</span>
                <input className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" value={editForm.reportTemplateRef} onChange={(e) => setEditForm((prev: any) => ({ ...prev, reportTemplateRef: e.target.value }))} placeholder="Template ID or slug" />
              </label>}
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

                  </div>

              {specimenConfigurationAllowed && <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Preparation Instructions</span>
                <textarea
                  rows={4}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.preparationInstructions}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, preparationInstructions: e.target.value }))}
                />
              </label>}

              {specimenConfigurationAllowed && <section className="md:col-span-2 rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Reference Ranges</h3>
                  <button type="button" onClick={() => setEditForm((prev: any) => ({ ...prev, referenceRanges: [...prev.referenceRanges, { label: "", gender: "all", ageGroup: "all", ageMinYears: "", ageMaxYears: "", low: "", high: "", criticalLow: "", criticalHigh: "", unit: "" }] }))} className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">+ Add Range</button>
                </div>
                <div className="space-y-3">
                  {editForm.referenceRanges.map((range: any, index: number) => <div key={index} className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Range {index + 1}</span>{editForm.referenceRanges.length > 1 && <button type="button" onClick={() => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.filter((_: any, rangeIndex: number) => rangeIndex !== index) }))} className="text-xs text-red-600">Remove</button>}</div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <input aria-label="Range label" className="rounded border px-2 py-1.5" placeholder="Label (e.g. Adult male)" value={range.label} onChange={(e) => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.map((item: any, i: number) => i === index ? { ...item, label: e.target.value } : item) }))} />
                      <select aria-label="Gender" className="rounded border px-2 py-1.5" value={range.gender} onChange={(e) => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.map((item: any, i: number) => i === index ? { ...item, gender: e.target.value } : item) }))}><option value="all">All genders</option><option value="male">Male</option><option value="female">Female</option></select>
                      <select aria-label="Age group" className="rounded border px-2 py-1.5" value={range.ageGroup} onChange={(e) => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.map((item: any, i: number) => i === index ? { ...item, ageGroup: e.target.value } : item) }))}><option value="all">All ages</option><option value="pediatric">Pediatric</option><option value="adult">Adult</option></select>
                      {(["ageMinYears", "ageMaxYears", "low", "high", "criticalLow", "criticalHigh"] as const).map((field) => <input key={field} type="number" step="0.01" aria-label={field} className="rounded border px-2 py-1.5" placeholder={{ ageMinYears: "Age min (years)", ageMaxYears: "Age max (years)", low: "Low", high: "High", criticalLow: "Critical low", criticalHigh: "Critical high" }[field]} value={range[field]} onChange={(e) => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.map((item: any, i: number) => i === index ? { ...item, [field]: e.target.value } : item) }))} />)}
                      <input aria-label="Unit override" className="rounded border px-2 py-1.5" placeholder="Unit override" value={range.unit} onChange={(e) => setEditForm((prev: any) => ({ ...prev, referenceRanges: prev.referenceRanges.map((item: any, i: number) => i === index ? { ...item, unit: e.target.value } : item) }))} />
                    </div>
                  </div>)}
                </div>
              </section>}

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
