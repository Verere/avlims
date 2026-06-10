"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CartItem } from "@/types/cart";
import { LabTest } from "@/types/test";

type PanelApi = {
  _id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  tests?: Array<{
    _id?: string;
    id?: string;
    name?: string;
    category?: string;
    price?: number;
  }>;
};

type Props = {
  cart: CartItem[];
  onAddPanelTests: (panel: { id: string; name: string; price: number }, tests: LabTest[]) => void;
};

export default function PanelSelector({ cart, onAddPanelTests }: Props) {
  const [query, setQuery] = useState("");
  const [panels, setPanels] = useState<PanelApi[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchPanels() {
      setLoading(true);
      try {
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1] || "";
        if (!branch) {
          setPanels([]);
          setLoading(false);
          return;
        }

        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          setPanels([]);
          setLoading(false);
          return;
        }

        const branchDoc = await branchRes.json();
        if (!branchDoc || !branchDoc._id) {
          setPanels([]);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/panels?branchId=${branchDoc._id}&isActive=true`);
        if (!res.ok) {
          setPanels([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setPanels(Array.isArray(data) ? data : []);
      } catch {
        setPanels([]);
      }
      setLoading(false);
    }

    fetchPanels();
  }, [pathname]);

  const filteredPanels = useMemo(() => {
    return panels.filter((panel) => {
      const q = query.toLowerCase();
      return panel.name?.toLowerCase().includes(q) || panel.code?.toLowerCase().includes(q) || panel.category?.toLowerCase().includes(q);
    });
  }, [panels, query]);

  const cartIds = useMemo(() => new Set(cart.map((item) => item.test.id)), [cart]);

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Panels</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search panel by name or code"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="max-h-40 overflow-y-auto space-y-2">
        {loading ? (
          <div className="p-2 text-gray-500">Loading...</div>
        ) : filteredPanels.length === 0 ? (
          <div className="p-2 text-gray-500">No panels found.</div>
        ) : (
          filteredPanels.map((panel) => {
            const mappedTests: LabTest[] = (panel.tests || [])
              .map((t) => ({
                id: String(t.id || t._id || ""),
                name: t.name || "Unnamed Test",
                category: t.category || panel.category || "",
                price: Number(t.price || 0),
              }))
              .filter((t) => t.id);

            const inCartCount = mappedTests.filter((t) => cartIds.has(t.id)).length;

            return (
              <div key={panel._id} className="border rounded p-2 hover:bg-blue-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{panel.name}</div>
                    <div className="text-xs text-gray-500">
                      {panel.code} | {panel.category} | {mappedTests.length} tests
                    </div>
                    <div className="text-xs text-gray-500">
                      In cart: {inCartCount}/{mappedTests.length}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-blue-700 text-white text-xs disabled:opacity-60"
                    disabled={mappedTests.length === 0}
                    onClick={() =>
                      onAddPanelTests(
                        { id: String(panel._id), name: panel.name, price: Number(panel.price || 0) },
                        mappedTests
                      )
                    }
                  >
                    Add Panel
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
