"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

type ReferenceRangeForm = {
  label: string;
  gender: "male" | "female" | "all";
  ageGroup: "pediatric" | "adult" | "all";
  ageMinYears: string;
  ageMaxYears: string;
  low: string;
  high: string;
  criticalLow: string;
  criticalHigh: string;
  unit: string;
};

async function fetchBranchBySlug(branch: string) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCategoriesByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/test-categories?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function toNumberOrUndefined(value: string) {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export default function AddTestPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [form, setForm] = useState({
    name: "",
    code: "",
    slug,
    categoryId: "",
    subCategory: "",
    price: "",
    type: "lab",
    resultType: "numeric",
    unit: "",
    turnaroundHours: "",
    requires_specimen_collection: false,
    specimen_type: "",
    container_type: "",
    collection_method: "",
    collection_instructions: "",
    collection_priority: "routine",
    collection_config_status: "needs_review",
    preparationInstructions: "",
    reportTemplateRef: "",
    isActive: true,
  });

  const [ranges, setRanges] = useState<ReferenceRangeForm[]>([
    {
      label: "Default",
      gender: "all",
      ageGroup: "all",
      ageMinYears: "",
      ageMaxYears: "",
      low: "",
      high: "",
      criticalLow: "",
      criticalHigh: "",
      unit: "",
    },
  ]);

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [specimenConfigurationAllowed, setSpecimenConfigurationAllowed] = useState(false);
  const [configurationLoading, setConfigurationLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setCategories([]);
      setConfigurationLoading(true);
      setSpecimenConfigurationAllowed(false);
      try {
        const [branchDoc, settingsRes] = await Promise.all([
          fetchBranchBySlug(branch),
          fetch(`/api/transaction-id-settings?labSlug=${encodeURIComponent(slug)}&branchSlug=${encodeURIComponent(branch)}`, { cache: "no-store" }),
        ]);
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setSpecimenConfigurationAllowed(settings.allowSpecimenConfiguration === true);
        }
        if (branchDoc && branchDoc._id) {
          const cats = await fetchCategoriesByBranchId(branchDoc._id);
          setCategories(cats);
        }
      } catch {
        setSpecimenConfigurationAllowed(false);
      } finally {
        setConfigurationLoading(false);
      }
    }
    if (branch && slug) fetchData();
    else setConfigurationLoading(false);
  }, [branch, slug]);

  const selectedCategory = useMemo(() => categories.find((cat) => cat._id === form.categoryId), [categories, form.categoryId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRangeChange = (index: number, key: keyof ReferenceRangeForm, value: string) => {
    setRanges((prev) => prev.map((range, i) => (i === index ? { ...range, [key]: value } : range)));
  };

  const addRange = () => {
    setRanges((prev) => [
      ...prev,
      {
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
      },
    ]);
  };

  const removeRange = (index: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");

        const referenceRanges =
          form.type === "lab"
            ? ranges
                .map((r) => ({
                  label: r.label || undefined,
                  gender: r.gender,
                  ageGroup: r.ageGroup,
                  ageMinYears: toNumberOrUndefined(r.ageMinYears),
                  ageMaxYears: toNumberOrUndefined(r.ageMaxYears),
                  low: toNumberOrUndefined(r.low),
                  high: toNumberOrUndefined(r.high),
                  criticalLow: toNumberOrUndefined(r.criticalLow),
                  criticalHigh: toNumberOrUndefined(r.criticalHigh),
                  unit: r.unit || form.unit || undefined,
                }))
                .filter((r) =>
                  r.label ||
                  r.low !== undefined ||
                  r.high !== undefined ||
                  r.criticalLow !== undefined ||
                  r.criticalHigh !== undefined ||
                  r.ageMinYears !== undefined ||
                  r.ageMaxYears !== undefined
                )
            : [];

        const payload = {
          name: form.name,
          code: form.code || undefined,
          slug: form.slug,
          category: selectedCategory ? selectedCategory.name : "",
          subCategory: form.subCategory.trim() || undefined,
          price: Number(form.price),
          branchId: branchDoc._id,
          type: form.type,
          resultType: form.resultType,
          unit: form.unit || undefined,
          turnaroundHours: toNumberOrUndefined(form.turnaroundHours),
          requires_specimen_collection: form.requires_specimen_collection,
          specimen_type: form.specimen_type || undefined,
          container_type: form.container_type || undefined,
          collection_method: form.collection_method || undefined,
          collection_instructions: form.collection_instructions || undefined,
          collection_priority: form.collection_priority,
          collection_config_status: form.collection_config_status,
          preparationInstructions: form.preparationInstructions || undefined,
          reportTemplateRef: form.type === "scan" ? form.reportTemplateRef || undefined : undefined,
          isActive: form.isActive,
          referenceRanges: specimenConfigurationAllowed && form.type === "lab" ? referenceRanges : [],
        };

        const res = await fetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add test");

        setSuccess(true);
        setForm({
          name: "",
          code: "",
          slug,
          categoryId: "",
          subCategory: "",
          price: "",
          type: "lab",
          resultType: "numeric",
          unit: "",
          turnaroundHours: "",
          requires_specimen_collection: false,
          specimen_type: "",
          container_type: "",
          collection_method: "",
          collection_instructions: "",
          collection_priority: "routine",
          collection_config_status: "needs_review",
          preparationInstructions: "",
          reportTemplateRef: "",
          isActive: true,
        });
        setRanges([
          {
            label: "Default",
            gender: "all",
            ageGroup: "all",
            ageMinYears: "",
            ageMaxYears: "",
            low: "",
            high: "",
            criticalLow: "",
            criticalHigh: "",
            unit: "",
          },
        ]);
      } catch (err: any) {
        setError(err?.message || "Failed to add test");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        {configurationLoading ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-600 shadow-lg">Loading branch configuration…</div>
        ) : <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-4 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Test catalogue</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Add Test</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Create a lab test or scan and add the details needed for ordering and reporting.</p>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-7">
            <div className="sm:col-span-2 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-800">Basic details</h3>
              <p className="mt-0.5 text-xs text-slate-500">Name, classification, and pricing.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Code</label>
              <input type="text" name="code" value={form.code} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="e.g. HB" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required>
                <option value="lab">lab</option>
                <option value="scan">scan</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Result Type</label>
              <select name="resultType" value={form.resultType} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required>
                <option value="numeric">numeric</option>
                <option value="qualitative">qualitative</option>
                <option value="enumerated">enumerated</option>
                <option value="text">text</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Price</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required min="0" step="0.01" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Unit</label>
              <input type="text" name="unit" value={form.unit} onChange={handleChange} className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="e.g. g/dL" />
            </div>

            {specimenConfigurationAllowed && <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Turnaround Time (hours)</label>
              <input type="number" name="turnaroundHours" value={form.turnaroundHours} onChange={handleChange} className="border rounded-lg px-3 py-2" min="0" step="1" />
            </div>}

            {form.type !== "lab" ? (
              <div className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">Report Template Reference</label>
                <input
                  type="text"
                  name="reportTemplateRef"
                  value={form.reportTemplateRef}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2"
                  placeholder="e.g. chest-ct-template-v1"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="font-medium text-gray-700">Category</label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange} className="border rounded-lg px-3 py-2" required>
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="font-medium text-gray-700">Subcategory</label>
              <input type="text" name="subCategory" value={form.subCategory} onChange={handleChange} className="rounded-lg border px-3 py-2" placeholder="Optional subcategory" />
            </div>

            {specimenConfigurationAllowed && <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="font-medium text-gray-700">Preparation Instructions</label>
              <textarea
                name="preparationInstructions"
                value={form.preparationInstructions}
                onChange={handleChange}
                className="border rounded-lg px-3 py-2"
                rows={3}
                placeholder="e.g. Fast for 8-12 hours before sample collection"
              />
            </div>}

            {form.type === "lab" && specimenConfigurationAllowed ? (
              <section className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                <h3 className="font-semibold text-gray-900">Specimen collection requirements</h3>
                <p className="mt-1 text-sm text-gray-600">Unknown requirements stay flagged for review. Choose “Configured” only after confirming the requirement.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Configuration status
                    <select name="collection_config_status" value={form.collection_config_status} onChange={handleChange} className="rounded-lg border bg-white px-3 py-2">
                      <option value="needs_review">Needs review</option>
                      <option value="configured">Configured</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Collection requirement
                    <select name="requires_specimen_collection" value={form.requires_specimen_collection ? "yes" : "no"} onChange={(event) => setForm((prev) => ({ ...prev, requires_specimen_collection: event.target.value === "yes" }))} className="rounded-lg border bg-white px-3 py-2">
                      <option value="no">No specimen collection</option>
                      <option value="yes">Specimen collection required</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Specimen type
                    <input list="specimen-types" name="specimen_type" value={form.specimen_type} onChange={handleChange} placeholder="Select or enter specimen type" className="rounded-lg border bg-white px-3 py-2" />
                    <datalist id="specimen-types">{["Blood", "Serum", "Plasma", "Urine", "Stool", "Sputum", "Swab", "Tissue", "Semen"].map((value) => <option key={value} value={value} />)}</datalist>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Container type
                    <input name="container_type" value={form.container_type} onChange={handleChange} placeholder="e.g. EDTA tube, plain tube, citrate tube" className="rounded-lg border bg-white px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Collection method
                    <input name="collection_method" value={form.collection_method} onChange={handleChange} placeholder="e.g. Venipuncture, urine collection" className="rounded-lg border bg-white px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">Collection priority
                    <select name="collection_priority" value={form.collection_priority} onChange={handleChange} className="rounded-lg border bg-white px-3 py-2">
                      <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-gray-700">Collection and handling instructions
                    <textarea name="collection_instructions" value={form.collection_instructions} onChange={handleChange} rows={3} className="rounded-lg border bg-white px-3 py-2" placeholder="Collection, transport, and handling instructions" />
                  </label>
                </div>
              </section>
            ) : null}

            <div className="sm:col-span-2 flex items-center gap-2">
              <input id="isActive" type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
              <label htmlFor="isActive" className="font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          {form.type === "lab" && specimenConfigurationAllowed ? (
            <div className="mt-6 rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Reference Ranges</h3>
                <button type="button" onClick={addRange} className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  + Add Range
                </button>
              </div>

              <div className="space-y-4">
                {ranges.map((range, index) => (
                  <div key={index} className="rounded border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Range {index + 1}</span>
                      {ranges.length > 1 ? (
                        <button type="button" onClick={() => removeRange(index)} className="text-xs text-red-600">
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <input className="border rounded px-2 py-1.5" placeholder="Label (e.g. Male Adult)" value={range.label} onChange={(e) => handleRangeChange(index, "label", e.target.value)} />
                      <select className="border rounded px-2 py-1.5" value={range.gender} onChange={(e) => handleRangeChange(index, "gender", e.target.value as any)}>
                        <option value="all">all genders</option>
                        <option value="male">male</option>
                        <option value="female">female</option>
                      </select>
                      <select className="border rounded px-2 py-1.5" value={range.ageGroup} onChange={(e) => handleRangeChange(index, "ageGroup", e.target.value as any)}>
                        <option value="all">all ages</option>
                        <option value="pediatric">pediatric</option>
                        <option value="adult">adult</option>
                      </select>
                      <input className="border rounded px-2 py-1.5" type="number" placeholder="Age min (years)" value={range.ageMinYears} onChange={(e) => handleRangeChange(index, "ageMinYears", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" type="number" placeholder="Age max (years)" value={range.ageMaxYears} onChange={(e) => handleRangeChange(index, "ageMaxYears", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" placeholder="Unit override" value={range.unit} onChange={(e) => handleRangeChange(index, "unit", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" type="number" step="0.01" placeholder="Low" value={range.low} onChange={(e) => handleRangeChange(index, "low", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" type="number" step="0.01" placeholder="High" value={range.high} onChange={(e) => handleRangeChange(index, "high", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" type="number" step="0.01" placeholder="Critical low" value={range.criticalLow} onChange={(e) => handleRangeChange(index, "criticalLow", e.target.value)} />
                      <input className="border rounded px-2 py-1.5" type="number" step="0.01" placeholder="Critical high" value={range.criticalHigh} onChange={(e) => handleRangeChange(index, "criticalHigh", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <input type="hidden" name="slug" value={form.slug} />

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div aria-live="polite" className="text-sm">
              {error ? <span className="text-red-700">{error}</span> : null}
              {success ? <span className="text-emerald-700">Test added successfully.</span> : null}
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={loading}
            >
              {loading ? "Adding…" : "Add Test"}
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
