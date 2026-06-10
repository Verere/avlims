"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";


async function fetchReferrersByBranchId(branchId) {
  try {
    const res = await fetch(`/api/referrers?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function softDeleteReferrer(id) {
  try {
    const res = await fetch("/api/referrers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch {
    return { error: "Failed to delete" };
  }
}

async function fetchBranchBySlug(branch) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function ReferrersTablePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        const data = await fetchReferrersByBranchId(branchDoc._id);
        setReferrers(data);
      } catch (e) {
        setError(e?.message || "Failed to fetch referrers");
        setReferrers([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  const handleDelete = async (ref) => {
    toast.warn(
      <div>
        Delete <b>{ref.name}</b>?<br />
        <button
          className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          onClick={async () => {
            toast.dismiss();
            const res = await softDeleteReferrer(ref._id);
            if (res.success) {
              toast.success("Referrer deleted");
              setReferrers((prev) => prev.filter((r) => r._id !== ref._id));
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <ToastContainer />
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Referrers</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Email</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Bank</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Account</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Ref Clinic</th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
            ) : referrers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No referrers found.</td></tr>
            ) : (
              referrers.map((ref) => (
                <tr key={ref._id} className="border-b hover:bg-blue-100/60 transition-all">
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-900 font-semibold group-hover:text-blue-700 whitespace-nowrap">{ref.name?.toUpperCase()}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.phone}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.email}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.bank}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.account}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-gray-800 whitespace-nowrap">{ref.refClinicName || ref.refClinic}</td>
                  <td className="px-3 py-2 sm:px-6 sm:py-4 text-center flex gap-2 justify-center">
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
                      onClick={() => alert(`Edit referrer: ${ref.name}`)}
                      title="Edit Referrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a1 1 0 01-1.213-1.213l1-4a4 4 0 01.828-1.414z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition"
                      onClick={() => handleDelete(ref)}
                      title="Delete Referrer"
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
    </div>
  );
}
