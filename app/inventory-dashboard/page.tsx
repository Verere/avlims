"use client";
import { useState, useEffect } from "react";


type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  min: number;
  unit: string;
  dailyConsumption: number;
};


export default function InventoryDashboard() {
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"name" | "stock">("name");
  const [desc, setDesc] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMobile(window.innerWidth < 768);
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      try {
        const res = await fetch("/api/inventory-dashboard");
        const data = await res.json();
        setItems(data);
      } catch (e) {
        setError("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  let filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));
  filtered = filtered.sort((a, b) => {
    if (sort === "name") return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
    if (sort === "stock") return desc ? b.stock - a.stock : a.stock - b.stock;
    return 0;
  });


  // Mobile: card-based
  if (mobile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col gap-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Inventory</h1>
        <input
          className="w-full border rounded px-3 py-2 mb-3 text-lg"
          placeholder="Filter items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div>No inventory items found.</div>
        ) : filtered.map(item => (
          <div
            key={item.id}
            className={`bg-white rounded-lg shadow p-4 flex flex-col gap-2 border-l-4 ${item.stock <= item.min ? "border-red-500" : "border-green-500"}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">{item.name}</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${item.stock <= item.min ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                {item.stock} {item.unit}
              </span>
            </div>
            {item.stock <= item.min && (
              <div className="text-red-600 font-semibold">Low stock! Min: {item.min}</div>
            )}
            <button
              className="text-blue-700 underline text-sm text-left mt-1"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              aria-expanded={expanded === item.id}
            >
              {expanded === item.id ? "Hide Daily Consumption" : "Show Daily Consumption"}
            </button>
            {expanded === item.id && (
              <div className="bg-gray-50 rounded p-2 mt-1 text-sm">
                <span className="font-semibold">Daily Consumption:</span> {item.dailyConsumption} {item.unit}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: table
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Inventory</h1>
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 text-lg"
          placeholder="Filter items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded bg-blue-700 text-white font-semibold"
          onClick={() => { setSort("name"); setDesc(d => !d); }}
        >
          Sort by Name {sort === "name" && (desc ? "↓" : "↑")}
        </button>
        <button
          className="px-3 py-2 rounded bg-blue-700 text-white font-semibold"
          onClick={() => { setSort("stock"); setDesc(d => !d); }}
        >
          Sort by Stock {sort === "stock" && (desc ? "↓" : "↑")}
        </button>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading...</div>
        ) : error ? (
          <div className="text-red-600 p-4">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4">No inventory items found.</div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow">
            <thead>
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-left px-4 py-2">Stock</th>
                <th className="text-left px-4 py-2">Unit</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Daily Consumption</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className={item.stock <= item.min ? "bg-red-50" : ""}>
                  <td className="px-4 py-2 font-semibold">{item.name}</td>
                  <td className="px-4 py-2">{item.stock}</td>
                  <td className="px-4 py-2">{item.unit}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm font-bold ${item.stock <= item.min ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                      {item.stock <= item.min ? "Low" : "OK"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="text-blue-700 underline text-sm"
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      aria-expanded={expanded === item.id}
                    >
                      {expanded === item.id ? "Hide" : "Show"}
                    </button>
                    {expanded === item.id && (
                      <div className="bg-gray-50 rounded p-2 mt-1 text-sm">
                        <span className="font-semibold">{item.dailyConsumption} {item.unit}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
