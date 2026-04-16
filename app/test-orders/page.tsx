"use client";
import { useState } from "react";

export default function AdvanceTestOrderStatus() {
  const [testOrderItemId, setTestOrderItemId] = useState("");
  const [labId, setLabId] = useState("");
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/test-order/advance-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOrderItemId, labId, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8">
      <h2 className="text-xl font-bold mb-4">Advance Test Order Status</h2>
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Test Order Item ID"
        value={testOrderItemId}
        onChange={e => setTestOrderItemId(e.target.value)}
      />
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Lab ID"
        value={labId}
        onChange={e => setLabId(e.target.value)}
      />
      <input
        className="border p-2 mb-2 w-full"
        placeholder="User ID (optional)"
        value={userId}
        onChange={e => setUserId(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={handleAdvance}
        disabled={loading}
      >
        {loading ? "Advancing..." : "Advance Status"}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {result && (
        <pre className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
