

"use client";
import React, { useState, useTransition, useEffect } from "react";
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

async function fetchCategoriesByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/test-categories?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default function AddSubCategoryPage() {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [form, setForm] = useState({ name: "", slug: "", categoryId: "" });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const res = await fetch("/api/sub-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            categoryId: form.categoryId,
            branchId: branchDoc._id,
          }),
        });
        if (!res.ok) throw new Error("Failed to add sub-category");
        setSuccess(true);
        setForm({ name: "", slug: "", categoryId: "" });
      } catch (e: any) {
        setError(e?.message || "Failed to add sub-category");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 max-w-md mx-auto w-full md:w-96 mt-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Add Sub Category</h2>
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
          {/* Hidden slug input */}
          <input type="hidden" name="slug" value={form.slug} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Category</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat: any) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Sub Category"}
        </button>
        {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mt-2 text-center">Sub category added successfully!</div>}
      </form>
    </div>
  );
}
