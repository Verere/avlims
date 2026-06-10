"use client";

import React, { useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export default function AddTestCategoryPage({ params }: { params: { slug: string; branch: string } }) {
  const [form, setForm] = useState({ name: "", slug: "" });
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const pathname = usePathname();
  // Example pathname: /lab-slug/branch-id/dashboard/add-test-category
  const pathParts = pathname.split("/").filter(Boolean);
  const lab = pathParts[0] || "";
  const branch = pathParts[1] || "";
  console.log("Destructured lab:", lab, "branch:", branch);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name") {
      // Generate slug in real-time from name
      setForm({ ...form, name: value });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        // Fetch lab and branch documents to get their IDs
      
      
        const res = await fetch(`/api/test-categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            slug: lab,
            branch: branch
          }),
        });
        if (!res.ok) throw new Error("Failed to add test category");
        setSuccess(true);
        setForm({ name: "" });
      } catch (e: any) {
        setError(e?.message || "Failed to add test category");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 max-w-md mx-auto w-full md:w-96 mt-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Add Test Category</h2>
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
          <input type="hidden" name="slug" value={lab} />
          <input type="hidden" name="branch" value={branch} />
        </div>
       
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Test Category"}
        </button>
        {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mt-2 text-center">Test category added successfully!</div>}
      </form>
    </div>
  );
}
