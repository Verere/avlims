"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

type ScanTest = {
  id: string;
  name: string;
  code?: string;
  type?: string;
};

type TemplateSectionForm = {
  key: string;
  title: string;
  defaultText: string;
  required: boolean;
  order: string;
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

async function fetchTestsByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/tests?branchId=${branchId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function AddResultTemplatePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [branchId, setBranchId] = useState("");
  const [scanTests, setScanTests] = useState<ScanTest[]>([]);
  const [selectedTestRefs, setSelectedTestRefs] = useState<string[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  const [form, setForm] = useState({
    title: "",
    modality: "xray",
    findingsDefaultText: "",
    impressionDefaultText: "",
    conclusionDefaultText: "",
    description: "",
    slug,
    isActive: true,
  });

  const [sections, setSections] = useState<TemplateSectionForm[]>([
    { key: "clinical_note", title: "Clinical Note", defaultText: "", required: false, order: "1" },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      if (!branch) return;
      setLoadingTests(true);
      setError(null);

      const branchDoc = await fetchBranchBySlug(branch);
      if (!branchDoc || !branchDoc._id) {
        setError("Branch not found");
        setLoadingTests(false);
        return;
      }

      setBranchId(branchDoc._id);
      const allTests = await fetchTestsByBranchId(branchDoc._id);
      const onlyScan = allTests
        .filter((t: any) => String(t.type || "").toLowerCase() === "scan")
        .map((t: any) => ({ id: String(t.id || ""), name: t.name || "", code: t.code || "", type: t.type || "" }))
        .filter((t: ScanTest) => t.id);

      setScanTests(onlyScan);
      setLoadingTests(false);
    }

    loadData();
  }, [branch]);

  const selectedCount = useMemo(() => selectedTestRefs.length, [selectedTestRefs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (index: number, key: keyof TemplateSectionForm, value: string | boolean) => {
    setSections((prev) => prev.map((sec, i) => (i === index ? { ...sec, [key]: value } : sec)));
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { key: "", title: "", defaultText: "", required: false, order: String(prev.length + 1) },
    ]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTestRef = (testId: string) => {
    setSelectedTestRefs((prev) => (prev.includes(testId) ? prev.filter((x) => x !== testId) : [...prev, testId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!branchId) {
      setError("Branch not resolved");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: form.title,
          modality: form.modality,
          findingsDefaultText: form.findingsDefaultText,
          impressionDefaultText: form.impressionDefaultText,
          conclusionDefaultText: form.conclusionDefaultText,
          sections: sections
            .map((sec) => ({
              key: sec.key.trim(),
              title: sec.title.trim(),
              defaultText: sec.defaultText,
              required: sec.required,
              order: Number(sec.order || 0),
            }))
            .filter((sec) => sec.key && sec.title),
          description: form.description,
          slug: form.slug,
          branchId,
          testRefs: selectedTestRefs,
          isActive: form.isActive,
        };

        const res = await fetch("/api/scan-report-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to create result template");

        setSuccess(true);
        setForm({
          title: "",
          modality: "xray",
          findingsDefaultText: "",
          impressionDefaultText: "",
          conclusionDefaultText: "",
          description: "",
          slug,
          isActive: true,
        });
        setSections([{ key: "clinical_note", title: "Clinical Note", defaultText: "", required: false, order: "1" }]);
        setSelectedTestRefs([]);
      } catch (err: any) {
        setError(err?.message || "Failed to create result template");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-blue-700">Add Result Template</h1>
            <p className="mt-1 text-sm text-gray-600">Create reusable scan report templates with structured sections and default text.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Chest X-Ray"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Modality</label>
              <select name="modality" value={form.modality} onChange={handleChange} className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200">
                <option value="xray">xray</option>
                <option value="ultrasound">ultrasound</option>
                <option value="ct">ct</option>
                <option value="mri">mri</option>
                <option value="mammography">mammography</option>
                <option value="ecg">ecg</option>
                <option value="echo">echo</option>
                <option value="other">other</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Findings Default Text</label>
              <textarea
                name="findingsDefaultText"
                value={form.findingsDefaultText}
                onChange={handleChange}
                rows={3}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Default findings text..."
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Impression Default Text</label>
              <textarea
                name="impressionDefaultText"
                value={form.impressionDefaultText}
                onChange={handleChange}
                rows={2}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Default impression text..."
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Conclusion Default Text</label>
              <textarea
                name="conclusionDefaultText"
                value={form.conclusionDefaultText}
                onChange={handleChange}
                rows={2}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Default conclusion text..."
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Optional description"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input id="isActive" name="isActive" type="checkbox" checked={form.isActive} onChange={handleChange} className="h-4 w-4" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Template</label>
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Editable Sections</h2>
              <button type="button" onClick={addSection} className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">+ Add Section</button>
            </div>

            <div className="space-y-3">
              {sections.map((sec, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Section {index + 1}</span>
                    {sections.length > 1 ? (
                      <button type="button" onClick={() => removeSection(index)} className="text-xs font-semibold text-red-600">Remove</button>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={sec.key}
                      onChange={(e) => handleSectionChange(index, "key", e.target.value)}
                      className="rounded border px-2 py-1.5 text-sm"
                      placeholder="key (e.g. liver_findings)"
                    />
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => handleSectionChange(index, "title", e.target.value)}
                      className="rounded border px-2 py-1.5 text-sm"
                      placeholder="title (e.g. Liver)"
                    />
                    <input
                      type="number"
                      value={sec.order}
                      onChange={(e) => handleSectionChange(index, "order", e.target.value)}
                      className="rounded border px-2 py-1.5 text-sm"
                      placeholder="order"
                    />
                    <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={sec.required}
                        onChange={(e) => handleSectionChange(index, "required", e.target.checked)}
                      />
                      Required
                    </label>
                    <textarea
                      value={sec.defaultText}
                      onChange={(e) => handleSectionChange(index, "defaultText", e.target.value)}
                      rows={2}
                      className="sm:col-span-2 rounded border px-2 py-1.5 text-sm"
                      placeholder="default section text"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Link to Scan Tests</h2>
              <span className="text-xs text-gray-600">Selected: {selectedCount}</span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded border">
              {loadingTests ? (
                <div className="p-3 text-sm text-gray-500">Loading scan tests...</div>
              ) : scanTests.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No scan tests found for this branch.</div>
              ) : (
                scanTests.map((test) => (
                  <label key={test.id} className="flex cursor-pointer items-center gap-3 border-b p-3 text-sm hover:bg-blue-50">
                    <input type="checkbox" checked={selectedTestRefs.includes(test.id)} onChange={() => toggleTestRef(test.id)} className="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">{test.name}</div>
                      <div className="text-xs text-gray-500">{test.code || "No code"}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <input type="hidden" name="slug" value={form.slug} />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Result Template"}
          </button>

          {error ? <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</div> : null}
          {success ? <div className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">Result template created successfully.</div> : null}
        </form>
      </div>
    </div>
  );
}
