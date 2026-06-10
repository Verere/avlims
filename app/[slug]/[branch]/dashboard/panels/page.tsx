"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type PanelTest = {
  _id?: string;
  name?: string;
  code?: string;
  price?: number;
};

type PanelItem = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  category?: string;
  price?: number;
  isActive?: boolean;
  tests?: PanelTest[];
  createdAt?: string;
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

async function fetchPanelsByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/panels?branchId=${branchId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatMoney(value: number | undefined) {
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString()}`;
}

export default function PanelsTablePage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branch = pathParts[1] || "";

  const [panels, setPanels] = useState<PanelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPanels() {
      setLoading(true);
      setError(null);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) {
          throw new Error("Branch not found");
        }
        const panelData = await fetchPanelsByBranchId(branchDoc._id);
        setPanels(panelData);
      } catch (e: any) {
        setError(e?.message || "Failed to load panels");
        setPanels([]);
      }
      setLoading(false);
    }

    if (branch) {
      loadPanels();
    }
  }, [branch]);

  const totals = useMemo(() => {
    const activePanels = panels.filter((panel) => panel.isActive !== false).length;
    const totalTests = panels.reduce((sum, panel) => sum + (Array.isArray(panel.tests) ? panel.tests.length : 0), 0);
    return { totalPanels: panels.length, activePanels, totalTests };
  }, [panels]);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Panels</h1>
          <p className="mt-1 text-sm text-gray-600">Branch panel catalog with pricing, linked tests, and status.</p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Panels</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{totals.totalPanels}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Panels</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{totals.activePanels}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Linked Tests</div>
            <div className="mt-1 text-2xl font-bold text-blue-700">{totals.totalTests}</div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-lg ring-1 ring-gray-100">
          {loading ? <div className="p-6 text-center text-gray-500">Loading panels...</div> : null}
          {error ? <div className="p-6 text-center text-red-600">{error}</div> : null}
          {!loading && !error && panels.length === 0 ? <div className="p-6 text-center text-gray-500">No panels found.</div> : null}

          {!loading && !error && panels.length > 0 ? (
            <>
              <div className="divide-y md:hidden">
                {panels.map((panel) => (
                  <div key={panel._id || panel.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-gray-900">{panel.name || "Untitled Panel"}</div>
                        <div className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">{panel.code || "NO-CODE"}</div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${panel.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {panel.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Category</div>
                        <div className="font-medium text-gray-800">{panel.category || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Price</div>
                        <div className="font-semibold text-gray-900">{formatMoney(panel.price)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Tests</div>
                        <div className="font-medium text-gray-800">{Array.isArray(panel.tests) ? panel.tests.length : 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Created</div>
                        <div className="font-medium text-gray-800">
                          {panel.createdAt ? new Date(panel.createdAt).toLocaleDateString() : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Tests</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panels.map((panel) => (
                      <tr key={panel._id || panel.id} className="border-b hover:bg-blue-50/60">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{panel.name || "Untitled Panel"}</div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{panel.code || "NO-CODE"}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-800">{panel.category || "-"}</td>
                        <td className="px-6 py-4 text-gray-800">{Array.isArray(panel.tests) ? panel.tests.length : 0}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatMoney(panel.price)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${panel.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {panel.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{panel.createdAt ? new Date(panel.createdAt).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
