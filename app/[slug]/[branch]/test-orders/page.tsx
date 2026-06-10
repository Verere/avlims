"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";


interface TestOrder {
  _id: string;
  patientId: string;
  name: string;
  amount: number;
  status: string;
  createdAt: string;
  tests?: {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    panel?: {
      id: string;
      name: string;
      price: number;
    };
  }[];
  referral?: string;
  discount?: number;
  bDate?: string;
  bonus?: number;
  user?: string;
}

export default function TestOrdersPage() {
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const pathname = usePathname();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const isSameDay = (value: string | undefined, ymd: string) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const [year, month, day] = ymd.split("-").map(Number);
    if (!year || !month || !day) return false;
    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        // Get branch from URL
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1];
        // Fetch branchId from API
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch info");
        const branchDoc = await branchRes.json();
        const branchId = branchDoc._id;
        // Fetch test orders for this branchId
        const res = await fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}`);
        if (!res.ok) throw new Error("Failed to fetch test orders");
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : [data]);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (pathname) fetchOrders();
  }, [pathname]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => isSameDay(order.bDate || order.createdAt, selectedDate)),
    [orders, selectedDate]
  );

  const totals = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, order) => {
          acc.amount += Number(order.amount || 0);
          acc.discount += Number(order.discount || 0);
          return acc;
        },
        { amount: 0, discount: 0 }
      ),
    [filteredOrders]
  );

  const renderTestsCell = (tests?: TestOrder["tests"]) => {
    if (!tests || tests.length === 0) return <span>-</span>;

    const panelGroups = new Map<string, { name: string; price: number; tests: string[] }>();
    const standalone: string[] = [];

    for (const test of tests) {
      if (test.panel?.id) {
        const existing = panelGroups.get(test.panel.id);
        if (existing) {
          existing.tests.push(test.name);
        } else {
          panelGroups.set(test.panel.id, { name: test.panel.name, price: Number(test.panel.price || 0), tests: [test.name] });
        }
      } else {
        standalone.push(test.name);
      }
    }

    return (
      <div className="space-y-1">
        {Array.from(panelGroups.entries()).map(([panelId, group]) => (
          <div key={panelId} className="rounded bg-slate-50 px-2 py-1">
            <div className="text-xs font-semibold text-blue-700">
              {group.name} - ₦{group.price.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">{group.tests.join(", ")}</div>
          </div>
        ))}
        {standalone.map((name, idx) => (
          <div key={`${name}-${idx}`} className="text-xs text-slate-700">
            {name}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Orders</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Test Orders</h1>
                <p className="mt-1 text-sm text-slate-600">View branch test orders by date.</p>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Amount</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.amount)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Discount</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(totals.discount)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Tests</th>
                    <th className="px-4 py-3 text-left">Referrer</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        Loading test orders...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        No test orders found for the selected date.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const orderDate = order.bDate || order.createdAt;
                      return (
                        <tr key={order._id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(orderDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTime(orderDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{order.name || "-"}</td>
                          <td className="max-w-xs px-4 py-3 text-slate-700">
                            {renderTestsCell(order.tests)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{order.referral || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{order.user || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(Number(order.amount || 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">
                            {formatCurrency(Number(order.discount || 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <Link href={`./test-orders/${order._id}`} className="font-medium text-blue-700 hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
