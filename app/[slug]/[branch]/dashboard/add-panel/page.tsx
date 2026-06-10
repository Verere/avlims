"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

type TestOption = {
  id: string;
  name: string;
  category?: string;
  price?: number;
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

export default function AddPanelPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "",
    price: "",
    description: "",
    isActive: true,
    slug,
  });
  const [tests, setTests] = useState<TestOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, startTransition] = useTransition();
  const [loadingTests, setLoadingTests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadBranchAndTests() {
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
      const fetchedTests = await fetchTestsByBranchId(branchDoc._id);
      setTests(fetchedTests);
      setLoadingTests(false);
    }

    loadBranchAndTests();
  }, [branch]);

  const filteredTests = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tests;
    return tests.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        String(t.category || "")
          .toLowerCase()
          .includes(q)
    );
  }, [tests, query]);

  const selectedTestsSummary = useMemo(() => {
    const selected = tests.filter((t) => selectedTestIds.includes(t.id));
    const total = selected.reduce((sum, t) => sum + Number(t.price || 0), 0);
    return { count: selected.length, total };
  }, [tests, selectedTestIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleTest = (id: string) => {
    setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredTests.map((t) => t.id);
    setSelectedTestIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleClearSelection = () => {
    setSelectedTestIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!branchId) {
      setError("Branch not resolved");
      return;
    }

    if (selectedTestIds.length === 0) {
      setError("Select at least one test for this panel");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: form.name,
          code: form.code,
          category: form.category,
          price: Number(form.price),
          tests: selectedTestIds,
          isActive: form.isActive,
          description: form.description,
          slug: form.slug,
          branchId,
        };

        const res = await fetch("/api/panels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to add panel" }));
          throw new Error(data.error || "Failed to add panel");
        }

        setSuccess(true);
        setForm({
          name: "",
          code: "",
          category: "",
          price: "",
          description: "",
          isActive: true,
          slug,
        });
        setSelectedTestIds([]);
      } catch (err: any) {
        setError(err?.message || "Failed to add panel");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-blue-700 sm:text-2xl">Add Panel</h1>
            <p className="mt-1 text-sm text-gray-600">Create a grouped test panel for this branch.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Panel Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Full Blood Count"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Panel Code</label>
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. FBC"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Category</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Hematology"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Panel Price</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active panel
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Optional notes about this panel"
            />
          </div>

          <div className="mt-6 rounded-xl border p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Select Tests</h2>
              <div className="text-xs text-gray-600">
                Selected: {selectedTestsSummary.count} | Sum of selected tests: N{selectedTestsSummary.total.toLocaleString()}
              </div>
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Search tests by name/category"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {loadingTests ? (
                <div className="p-3 text-sm text-gray-500">Loading tests...</div>
              ) : filteredTests.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No tests found.</div>
              ) : (
                filteredTests.map((test) => {
                  const checked = selectedTestIds.includes(test.id);
                  return (
                    <label key={test.id} className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-blue-50">
                      <input type="checkbox" checked={checked} onChange={() => handleToggleTest(test.id)} className="mt-1 h-4 w-4" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">{test.name}</div>
                        <div className="text-xs text-gray-500">
                          {test.category || "Uncategorized"} | N{Number(test.price || 0).toLocaleString()}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <input type="hidden" name="slug" value={form.slug} />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Adding panel..." : "Add Panel"}
          </button>

          {error ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div> : null}
          {success ? <div className="mt-3 rounded-lg bg-green-50 p-2 text-sm text-green-700">Panel added successfully.</div> : null}
        </form>
      </div>
    </div>
  );
}
