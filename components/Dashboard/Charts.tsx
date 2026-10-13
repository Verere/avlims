"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DashboardPeriod } from "@/types/dashboard";

type RevenuePoint = { date: string; revenue: number };
type TestCategory = { category: string; value: number };
type DashboardOrder = {
  bDate?: string;
  createdAt?: string;
  isCancelled?: boolean;
  revenue?: number;
  amount?: number;
  tests?: unknown[];
};

const COLORS = ["#6366f1", "#22d3ee", "#34d399", "#fbbf24", "#f87171"];

function getBusinessDate(order: DashboardOrder) {
  return String(order.bDate || order.createdAt || "").slice(0, 10);
}

function makeChartData(orders: DashboardOrder[], period: DashboardPeriod) {
  const revenueByDate = new Map<string, number>();
  const firstDate = new Date(`${period.from}T00:00:00`);
  const lastDate = new Date(`${period.to}T00:00:00`);
  for (const date = new Date(firstDate); date <= lastDate; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    revenueByDate.set(key, 0);
  }

  const testsByCategory = new Map<string, number>();
  for (const order of orders) {
    if (order.isCancelled) continue;
    const date = getBusinessDate(order);
    if (date < period.from || date > period.to) continue;

    revenueByDate.set(date, (revenueByDate.get(date) || 0) + Number(order.revenue ?? order.amount ?? 0));

    for (const test of order.tests || []) {
      if (!test || typeof test !== "object") {
        testsByCategory.set("Other", (testsByCategory.get("Other") || 0) + 1);
        continue;
      }
      const entry = test as Record<string, unknown>;
      const panel = entry.panel && typeof entry.panel === "object"
        ? String((entry.panel as Record<string, unknown>).name || "")
        : "";
      const category = String(entry.category || panel || entry.name || entry.testName || "Other");
      const quantity = Number(entry.quantity);
      testsByCategory.set(
        category,
        (testsByCategory.get(category) || 0) + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1)
      );
    }
  }

  const revenueData = Array.from(revenueByDate, ([date, revenue]) => ({
    date: date.slice(5),
    revenue,
  }));
  const sortedTests = Array.from(testsByCategory, ([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
  const testDistData = sortedTests.length > 5
    ? [
        ...sortedTests.slice(0, 4),
        { category: "Other", value: sortedTests.slice(4).reduce((sum, entry) => sum + entry.value, 0) },
      ]
    : sortedTests;

  return { revenueData, testDistData };
}

export default function Charts({ period }: { period: DashboardPeriod | null }) {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branch = pathParts[1] || "";
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [testDistData, setTestDistData] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const periodFrom = period?.from;
  const periodTo = period?.to;

  useEffect(() => {
    let cancelled = false;

    async function loadChartData() {
      if (!branch || !periodFrom || !periodTo) {
        setLoading(false);
        setRevenueData([]);
        setTestDistData([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const branchResponse = await fetch(`/api/branches/${branch}`);
        if (!branchResponse.ok) throw new Error("Failed to load branch for charts");
        const branchData = await branchResponse.json();
        if (!branchData?._id) throw new Error("Branch not found for charts");

        const ordersResponse = await fetch(`/api/test-orders?branchId=${encodeURIComponent(branchData._id)}`);
        if (!ordersResponse.ok) throw new Error("Failed to load chart orders");
        const orders: unknown = await ordersResponse.json();
        if (!Array.isArray(orders)) throw new Error("Unexpected chart orders response");

        const chartData = makeChartData(orders as DashboardOrder[], { from: periodFrom, to: periodTo });
        if (!cancelled) {
          setRevenueData(chartData.revenueData);
          setTestDistData(chartData.testDistData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard charts");
          setRevenueData([]);
          setTestDistData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadChartData();
    return () => {
      cancelled = true;
    };
  }, [branch, periodFrom, periodTo]);

  return (
    <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Revenue Over Time</h2>
        {error ? <p className="py-8 text-center text-sm text-red-700">{error}</p> : loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading chart...</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `₦${Number(value).toLocaleString()}`} />
              <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Test Distribution</h2>
        {error ? <p className="py-8 text-center text-sm text-red-700">{error}</p> : loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading chart...</p>
        ) : testDistData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No test entries for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={testDistData}
                dataKey="value"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {testDistData.map((entry, index) => (
                  <Cell key={`cell-${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
