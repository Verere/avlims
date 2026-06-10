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
    price: "",
    type: "lab",
    resultType: "numeric",
    unit: "",
    turnaroundHours: "",
    sampleType: "blood",
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

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setCategories([]);
      const branchDoc = await fetchBranchBySlug(branch);
      if (branchDoc && branchDoc._id) {
        const cats = await fetchCategoriesByBranchId(branchDoc._id);
        setCategories(cats);
      }
    }
    if (branch) fetchData();
  }, [branch]);

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
          price: Number(form.price),
          branchId: branchDoc._id,
          type: form.type,
          resultType: form.resultType,
          unit: form.unit || undefined,
          turnaroundHours: toNumberOrUndefined(form.turnaroundHours),
          sampleType: form.type === "lab" ? form.sampleType : undefined,
          preparationInstructions: form.preparationInstructions || undefined,
          reportTemplateRef: form.type === "scan" ? form.reportTemplateRef || undefined : undefined,
          isActive: form.isActive,
          referenceRanges,
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
          price: "",
          type: "lab",
          resultType: "numeric",
          unit: "",
          turnaroundHours: "",
          sampleType: "blood",
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
      <div className="mx-auto w-full max-w-4xl">
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
          <h2 className="mb-2 text-center text-2xl font-bold text-blue-700">Add Test</h2>
          <p className="mb-5 text-center text-sm text-gray-600">Create lab or scan tests with full metadata and optional lab reference ranges.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="border rounded-lg px-3 py-2" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Code</label>
              <input type="text" name="code" value={form.code} onChange={handleChange} className="border rounded-lg px-3 py-2" placeholder="e.g. HB" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="border rounded-lg px-3 py-2" required>
                <option value="lab">lab</option>
                <option value="scan">scan</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Result Type</label>
              <select name="resultType" value={form.resultType} onChange={handleChange} className="border rounded-lg px-3 py-2" required>
                <option value="numeric">numeric</option>
                <option value="qualitative">qualitative</option>
                <option value="enumerated">enumerated</option>
                <option value="text">text</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Price</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} className="border rounded-lg px-3 py-2" required min="0" step="0.01" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Unit</label>
              <input type="text" name="unit" value={form.unit} onChange={handleChange} className="border rounded-lg px-3 py-2" placeholder="e.g. g/dL" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Turnaround Time (hours)</label>
              <input type="number" name="turnaroundHours" value={form.turnaroundHours} onChange={handleChange} className="border rounded-lg px-3 py-2" min="0" step="1" />
            </div>

            {form.type === "lab" ? (
              <div className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">Sample Type</label>
                <select name="sampleType" value={form.sampleType} onChange={handleChange} className="border rounded-lg px-3 py-2">
                  <option value="blood">blood</option>
                  <option value="urine">urine</option>
                  <option value="stool">stool</option>
                  <option value="serum">serum</option>
                  <option value="swab">swab</option>
                  <option value="csf">csf</option>
                  <option value="sputum">sputum</option>
                  <option value="other">other</option>
                </select>
              </div>
            ) : (
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
            )}

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
              <label className="font-medium text-gray-700">Preparation Instructions</label>
              <textarea
                name="preparationInstructions"
                value={form.preparationInstructions}
                onChange={handleChange}
                className="border rounded-lg px-3 py-2"
                rows={3}
                placeholder="e.g. Fast for 8-12 hours before sample collection"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input id="isActive" type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
              <label htmlFor="isActive" className="font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          {form.type === "lab" ? (
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

          <button
            type="submit"
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Test"}
          </button>

          {error ? <div className="mt-3 text-center text-sm text-red-600">{error}</div> : null}
          {success ? <div className="mt-3 text-center text-sm text-green-600">Test added successfully!</div> : null}
        </form>
      </div>
    </div>
  );
}
