"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { LabTest } from '../types/test';
import { CartItem } from '../types/cart';

type Props = {
  cart: CartItem[];
  onAdd: (test: LabTest) => void;
};

export default function TestSelector({ cart, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  useEffect(() => {
    async function fetchTests() {
      setLoading(true);
      try {
        // Extract branch from pathname
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1] || "";
        if (!branch) {
          setTests([]);
          setLoading(false);
          return;
        }
        // Fetch branchId by slug
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          setTests([]);
          setLoading(false);
          return;
        }
        const branchDoc = await branchRes.json();
        if (!branchDoc || !branchDoc._id) {
          setTests([]);
          setLoading(false);
          return;
        }
        // Fetch tests by branchId
        const res = await fetch(`/api/tests?branchId=${branchDoc._id}`);
        if (res.ok) {
          const data = await res.json();
          setTests(data);
        } else {
          setTests([]);
        }
      } catch {
        setTests([]);
      }
      setLoading(false);
    }
    fetchTests();
  }, [pathname]);

  const categories = Array.from(new Set(tests.map(t => t.category)));
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Lab Tests</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search test by name"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-40 overflow-y-auto">
        {loading ? (
          <div className="p-2 text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-2 text-gray-500">No tests found.</div>
        ) : (
          categories.map(cat => (
            <div key={cat}>
              <div className="font-semibold text-xs text-gray-600 mt-2 mb-1">{cat}</div>
              {tests.filter(t =>
                t.category === cat &&
                t.name.toLowerCase().includes(query.toLowerCase())
              ).map(test => {
                const inCart = cart.some(item => item.test.id === test.id);
                return (
                  <div
                    key={test.id}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer hover:bg-blue-100 ${inCart ? 'bg-blue-50' : ''}`}
                    onClick={() => onAdd(test)}
                  >
                    <span>{test.name}</span>
                    <span className="text-xs text-gray-500">₦{test.price.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
