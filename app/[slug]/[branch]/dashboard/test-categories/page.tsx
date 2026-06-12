
"use client";
import React, { useEffect, useState } from "react";
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

async function getTestCategoriesByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/test-categories?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}


export default function TestCategoriesPage() {
  const pathname = usePathname();
  // Example: /lab-slug/branch-id/dashboard/test-categories
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const branchDoc = await fetchBranchBySlug(branch);

        if (!branchDoc || !branchDoc._id) {
          setError("Branch not found");
          setCategories([]);
          setLoading(false);
          return;
        }
        const cats = await getTestCategoriesByBranchId(branchDoc._id);
    console.log('Fetched test categories:', cats);

        setCategories(cats);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch categories");
        setCategories([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Test Categories</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Category Name</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : categories.length === 0 ? (
              <tr><td className="px-6 py-4 text-center text-gray-500">No categories found.</td></tr>
            ) : (
              categories.map((cat: any) => (
                <tr key={cat._id} className="border-b hover:bg-blue-50 transition">
                  <td className="px-6 py-4 text-gray-800 font-medium">{cat.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
