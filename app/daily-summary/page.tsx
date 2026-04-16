"use client";
import { useEffect, useState } from "react";


interface SummaryData {
  totalTests: number;
  totalRevenue: number;
  consumablesUsed: number;
  reagentsUsed: number;
  labWearUsed: number;
  outstandingBalance: number;
}

type DrillType = 'tests' | 'revenue' | 'consumables' | 'reagents' | 'labwear' | 'outstanding';


export default function DailySummaryPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const [drillType, setDrillType] = useState<DrillType | null>(null);
  const [drillData, setDrillData] = useState<any[] | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState("");

  useEffect(() => {
    setMobile(window.innerWidth < 768);
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily-summary");
        const d = await res.json();
        setData(d);
      } catch (e) {
        setError("Failed to load summary");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  async function handleDrill(type: DrillType) {
    setDrillType(type);
    setDrillLoading(true);
    setDrillError("");
    try {
      const res = await fetch(`/api/daily-summary/drilldown?type=${type}`);
      const d = await res.json();
      setDrillData(d);
    } catch (e) {
      setDrillError("Failed to load details");
      setDrillData(null);
    } finally {
      setDrillLoading(false);
    }
  }

  function handleExport() {
    if (!drillData) return;
    const csv = [
      Object.keys(drillData[0] || {}).join(","),
      ...drillData.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${drillType}-details.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return null;

  // Drilldown modal
  if (drillType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
          <button className="absolute top-2 right-2 text-gray-500 text-2xl" onClick={() => setDrillType(null)}>&times;</button>
          <div className="text-xl font-bold mb-4 capitalize">{drillType} details</div>
          {drillLoading ? (
            <div>Loading...</div>
          ) : drillError ? (
            <div className="text-red-600">{drillError}</div>
          ) : !drillData || drillData.length === 0 ? (
            <div>No data found.</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {Object.keys(drillData[0]).map(key => (
                      <th key={key} className="px-2 py-1 text-left bg-gray-100">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillData.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-2 py-1 border-b">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {drillData && drillData.length > 0 && (
            <button className="mt-4 bg-blue-700 text-white px-4 py-2 rounded font-bold" onClick={handleExport}>
              Export to CSV
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile: stacked KPI cards
  if (mobile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col gap-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Daily Summary</h1>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('tests')}>
          <span className="text-lg font-semibold">Total Tests</span>
          <span className="text-3xl font-bold text-blue-700">{data.totalTests}</span>
        </button>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('revenue')}>
          <span className="text-lg font-semibold">Total Revenue</span>
          <span className="text-3xl font-bold text-green-700">${data.totalRevenue}</span>
        </button>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('consumables')}>
          <span className="text-lg font-semibold">Consumables Used</span>
          <span className="text-2xl font-bold">{data.consumablesUsed}</span>
        </button>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('reagents')}>
          <span className="text-lg font-semibold">Reagents Used</span>
          <span className="text-2xl font-bold">{data.reagentsUsed}</span>
        </button>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('labwear')}>
          <span className="text-lg font-semibold">Lab Wear Used</span>
          <span className="text-2xl font-bold">{data.labWearUsed}</span>
        </button>
        <button className="bg-white rounded shadow p-4 flex flex-col gap-2 text-left" onClick={() => handleDrill('outstanding')}>
          <span className="text-lg font-semibold">Outstanding Balance</span>
          <span className="text-2xl font-bold text-red-700">${data.outstandingBalance}</span>
        </button>
      </div>
    );
  }

  // Desktop: grid layout with charts (simple bar charts for demo)
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-8">Daily Summary</h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-blue-50" onClick={() => handleDrill('tests')}>
          <span className="text-lg font-semibold mb-2">Total Tests</span>
          <span className="text-4xl font-bold text-blue-700 mb-2">{data.totalTests}</span>
          <div className="w-full h-2 bg-blue-100 rounded">
            <div className="h-2 bg-blue-700 rounded" style={{ width: `${Math.min(data.totalTests, 100)}%` }} />
          </div>
        </button>
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-green-50" onClick={() => handleDrill('revenue')}>
          <span className="text-lg font-semibold mb-2">Total Revenue</span>
          <span className="text-4xl font-bold text-green-700 mb-2">${data.totalRevenue}</span>
          <div className="w-full h-2 bg-green-100 rounded">
            <div className="h-2 bg-green-700 rounded" style={{ width: `${Math.min(data.totalRevenue / 10, 100)}%` }} />
          </div>
        </button>
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-red-50" onClick={() => handleDrill('outstanding')}>
          <span className="text-lg font-semibold mb-2">Outstanding Balance</span>
          <span className="text-4xl font-bold text-red-700 mb-2">${data.outstandingBalance}</span>
          <div className="w-full h-2 bg-red-100 rounded">
            <div className="h-2 bg-red-700 rounded" style={{ width: `${Math.min(data.outstandingBalance / 10, 100)}%` }} />
          </div>
        </button>
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-yellow-50 col-span-1" onClick={() => handleDrill('consumables')}>
          <span className="text-lg font-semibold mb-2">Consumables Used</span>
          <span className="text-3xl font-bold">{data.consumablesUsed}</span>
          <div className="w-full h-2 bg-yellow-100 rounded">
            <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(data.consumablesUsed * 10, 100)}%` }} />
          </div>
        </button>
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-purple-50 col-span-1" onClick={() => handleDrill('reagents')}>
          <span className="text-lg font-semibold mb-2">Reagents Used</span>
          <span className="text-3xl font-bold">{data.reagentsUsed}</span>
          <div className="w-full h-2 bg-purple-100 rounded">
            <div className="h-2 bg-purple-500 rounded" style={{ width: `${Math.min(data.reagentsUsed * 10, 100)}%` }} />
          </div>
        </button>
        <button className="bg-white rounded shadow p-6 flex flex-col items-center hover:bg-gray-100 col-span-1" onClick={() => handleDrill('labwear')}>
          <span className="text-lg font-semibold mb-2">Lab Wear Used</span>
          <span className="text-3xl font-bold">{data.labWearUsed}</span>
          <div className="w-full h-2 bg-gray-200 rounded">
            <div className="h-2 bg-gray-700 rounded" style={{ width: `${Math.min(data.labWearUsed * 10, 100)}%` }} />
          </div>
        </button>
      </div>
    </div>
  );
}
