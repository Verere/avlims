"use client";
import { useState } from "react";


import { useEffect } from "react";

type TestOrder = {
  id: string;
  patient: string;
  test: string;
  status: string;
  history: { status: string; at: string }[];
};

const statusColors: Record<string, string> = {
  REGISTERED: "bg-gray-200 text-gray-800",
  COLLECTED: "bg-blue-100 text-blue-800",
  RUNNING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  VERIFIED: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  REGISTERED: "Registered",
  COLLECTED: "Collected",
  RUNNING: "Running",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
};

// Dummy user role (replace with real auth/role logic)
const userRole = "technician"; // or "collector", "verifier"

const nextStatus: Record<string, string | null> = {
  REGISTERED: "COLLECTED",
  COLLECTED: "RUNNING",
  RUNNING: "COMPLETED",
  COMPLETED: "VERIFIED",
  VERIFIED: null,
};


export default function TestTrackingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const res = await fetch("/api/test-tracking");
        const data = await res.json();
        setOrders(data);
      } catch (e) {
        setError("Failed to load test orders");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  async function handleAdvance(id: string) {
    try {
      const res = await fetch("/api/test-tracking/advance-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId: "user1" }), // Replace with real user context
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to update status");
        return;
      }
      const data = await res.json();
      setOrders(orders =>
        orders.map(o =>
          o.id === id && data.status
            ? {
                ...o,
                status: data.status,
                history: [
                  ...o.history,
                  { status: data.status, at: data.at },
                ],
              }
            : o
        )
      );
    } catch (e) {
      setError("Failed to update status");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Test Tracking</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : orders.length === 0 ? (
        <div>No test orders found.</div>
      ) : orders.map(order => (
        <div key={order.id} className="bg-white rounded-lg shadow p-4 mb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">{order.patient}</div>
              <div className="text-gray-600 text-base">{order.test}</div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[order.status]}`}
              aria-label={`Status: ${statusLabels[order.status]}`}
            >
              {statusLabels[order.status]}
            </span>
          </div>
          {/* Actions by role */}
          {userRole === "technician" && nextStatus[order.status] && (
            <button
              className="w-full bg-blue-700 text-white rounded text-lg font-bold py-3 mt-2 mb-1 min-h-[44px]"
              onClick={() => handleAdvance(order.id)}
            >
              Mark as {statusLabels[nextStatus[order.status]!]}
            </button>
          )}
          {/* Timeline/history collapsible */}
          <button
            className="text-blue-700 underline text-sm mt-1 text-left"
            onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            aria-expanded={expanded === order.id}
          >
            {expanded === order.id ? "Hide History" : "Show History"}
          </button>
          {expanded === order.id && (
            <div className="mt-2 bg-gray-50 rounded p-2 text-sm">
              <ul className="space-y-1">
                {order.history.map((h, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${statusColors[h.status]}`}></span>
                    <span>{statusLabels[h.status]}</span>
                    <span className="ml-auto text-gray-500">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
