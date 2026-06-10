"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

type TemplateOption = {
  id: string;
  title: string;
  modality?: string;
};

type TestOption = {
  id: string;
  name: string;
  code?: string;
  type?: string;
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

async function fetchTemplatesByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/scan-report-templates?branchId=${branchId}&isActive=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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

export default function AddFindingsPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [branchId, setBranchId] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [linkType, setLinkType] = useState<"template" | "test">("template");
  const [selectedTemplateRef, setSelectedTemplateRef] = useState("");
  const [selectedTestRef, setSelectedTestRef] = useState("");
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    section: "findings",
    modality: "",
    slug,
    isActive: true,
  });

  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadBranchData() {
      if (!branch) return;
      setLoadingLookup(true);
      setError(null);

      const branchDoc = await fetchBranchBySlug(branch);
      if (!branchDoc || !branchDoc._id) {
        setError("Branch not found");
        setLoadingLookup(false);
        return;
      }

      setBranchId(branchDoc._id);
      const [templateData, testData] = await Promise.all([
        fetchTemplatesByBranchId(branchDoc._id),
        fetchTestsByBranchId(branchDoc._id),
      ]);

      setTemplates(
        templateData.map((t: any) => ({
          id: String(t._id || t.id || ""),
          title: t.title || "Untitled template",
          modality: t.modality || "",
        }))
      );

      setTests(
        testData.map((t: any) => ({
          id: String(t.id || t._id || ""),
          name: t.name || "Unnamed test",
          code: t.code || "",
          type: t.type || "",
        }))
      );

      setLoadingLookup(false);
    }

    loadBranchData();
  }, [branch]);

  const filteredTemplates = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter((template) =>
      template.title.toLowerCase().includes(q) || template.modality?.toLowerCase().includes(q)
    );
  }, [templates, query]);

  const filteredTests = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tests;
    return tests.filter((test) => test.name.toLowerCase().includes(q) || test.code?.toLowerCase().includes(q));
  }, [tests, query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (!form.content.trim()) {
      setError("Content is required");
      return;
    }

    if (linkType === "template" && !selectedTemplateRef) {
      setError("Select a report template to link this finding");
      return;
    }

    if (linkType === "test" && !selectedTestRef) {
      setError("Select a test to link this finding");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: form.title,
          content: form.content,
          section: form.section,
          modality: form.modality || undefined,
          slug: form.slug,
          branchId,
          isActive: form.isActive,
          reportTemplateRef: linkType === "template" ? selectedTemplateRef : undefined,
          testRef: linkType === "test" ? selectedTestRef : undefined,
        };

        const res = await fetch("/api/findings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add finding");

        setSuccess(true);
        setForm({
          title: "",
          content: "",
          section: "findings",
          modality: "",
          slug,
          isActive: true,
        });
        setSelectedTemplateRef("");
        setSelectedTestRef("");
        setLinkType("template");
      } catch (err: any) {
        setError(err?.message || "Failed to add finding");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-blue-700">Add Findings</h1>
            <p className="mt-1 text-sm text-gray-600">Create reusable report snippets and link them to a scan template or test.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Normal Liver"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Section</label>
              <select name="section" value={form.section} onChange={handleChange} className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200">
                <option value="findings">findings</option>
                <option value="impression">impression</option>
                <option value="conclusion">conclusion</option>
                <option value="other">other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Modality</label>
              <input
                type="text"
                name="modality"
                value={form.modality}
                onChange={handleChange}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. xray, ct, ultrasound"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Content</label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                rows={5}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Reusable snippet text..."
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input id="isActive" name="isActive" type="checkbox" checked={form.isActive} onChange={handleChange} className="h-4 w-4" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Snippet</label>
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Link Snippet</h2>
                <p className="text-xs text-gray-500">Choose whether this finding belongs to a scan template or a test.</p>
              </div>
              <div className="inline-flex rounded-lg border overflow-hidden self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLinkType("template")}
                  className={`px-3 py-2 text-sm font-semibold ${linkType === "template" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
                >
                  Report Template
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType("test")}
                  className={`px-3 py-2 text-sm font-semibold ${linkType === "test" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
                >
                  Test
                </button>
              </div>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={linkType === "template" ? "Search templates by title/modality" : "Search tests by name/code"}
            />

            {linkType === "template" ? (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {loadingLookup ? (
                  <div className="p-3 text-sm text-gray-500">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No templates found.</div>
                ) : (
                  filteredTemplates.map((template) => {
                    const checked = selectedTemplateRef === template.id;
                    return (
                      <label key={template.id} className="flex cursor-pointer items-center gap-3 border-b p-3 text-sm hover:bg-blue-50 last:border-b-0">
                        <input type="radio" name="templateRef" checked={checked} onChange={() => setSelectedTemplateRef(template.id)} className="h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900">{template.title}</div>
                          <div className="text-xs text-gray-500">{template.modality || "other"}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {loadingLookup ? (
                  <div className="p-3 text-sm text-gray-500">Loading tests...</div>
                ) : filteredTests.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No tests found.</div>
                ) : (
                  filteredTests.map((test) => {
                    const checked = selectedTestRef === test.id;
                    return (
                      <label key={test.id} className="flex cursor-pointer items-center gap-3 border-b p-3 text-sm hover:bg-blue-50 last:border-b-0">
                        <input type="radio" name="testRef" checked={checked} onChange={() => setSelectedTestRef(test.id)} className="h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900">{test.name}</div>
                          <div className="text-xs text-gray-500">{test.code || "No code"}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <input type="hidden" name="slug" value={form.slug} />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Finding"}
          </button>

          {error ? <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</div> : null}
          {success ? <div className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">Finding added successfully.</div> : null}
        </form>
      </div>
    </div>
  );
}
