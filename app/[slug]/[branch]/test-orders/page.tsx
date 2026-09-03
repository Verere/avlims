"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";


interface TestOrder {
  _id: string;
  transId?: string;
  patientId: string;
  name: string;
  amount: number;
  amountPaid?: number;
  bal?: number;
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredOrders = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!isSameDay(order.bDate || order.createdAt, selectedDate)) return false;
      if (!normalizedSearchQuery) return true;

      const testNames = order.tests?.flatMap((test) => [test.name, test.panel?.name]) || [];
      return [
        order.transId,
        order.name,
        order.patientId,
        order.referral,
        order.user,
        order.status,
        order.amount,
        order.discount,
        ...testNames,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
    });
  }, [orders, searchQuery, selectedDate]);

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

  const printReceipt = async (order: TestOrder) => {
    const receiptWindow = window.open("", "_blank", "width=900,height=700");
    if (!receiptWindow) return;

    receiptWindow.document.open();
    receiptWindow.document.write("<p style='font-family:Arial;padding:16px;'>Preparing receipt...</p>");
    receiptWindow.document.close();

    try {
      const pathParts = (pathname || "").split("/").filter(Boolean);
      const [labSlug, branchSlug] = pathParts;
      const branchRes = await fetch(`/api/branches/${branchSlug}`);
      const branchDoc = branchRes.ok ? await branchRes.json() : {};
      const labRes = labSlug ? await fetch(`/api/labs/${labSlug}`) : null;
      const labDoc = labRes?.ok ? await labRes.json() : {};
      const escapeHtml = (value: unknown) =>
        String(value ?? "-")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#039;");
      const testsHtml = (order.tests || [])
        .map((test) => {
          const amount = test.panel ? Number(test.panel.price || 0) : Number(test.price || 0) * Number(test.quantity || 1);
          const name = test.panel ? `${test.panel.name} (Panel)` : test.name;
          return `<tr><td>${escapeHtml(name)}</td><td>${formatCurrency(amount)}</td></tr>`;
        })
        .join("");
      const orderDate = order.bDate || order.createdAt;
      const total = Number(order.amount || 0);
      const paid = Number(order.amountPaid || 0);
      const balance = Number(order.bal ?? total - paid);

      receiptWindow.document.open();
      receiptWindow.document.write(`<!doctype html>
        <html><head><meta charset="utf-8"><title>Test Order Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body { width: 80mm; margin: 0 auto; padding: 5mm 4mm 7mm; color: #172033; font: 600 12px/1.45 "Courier New", monospace; }
          header { padding-bottom: 10px; border-bottom: 2px solid #172033; text-align: center; }
          h1 { margin: 0; font: 800 20px/1.15 Arial, sans-serif; }
          .branch, .contact { margin-top: 4px; color: #475569; font-size: 11px; }
          .details { margin: 11px 0; padding-bottom: 9px; border-bottom: 1px dashed #64748b; }
          .detail { display: flex; justify-content: space-between; gap: 10px; margin: 3px 0; }
          .label { color: #64748b; } table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 6px 2px; border-bottom: 1px solid #d5dbe5; text-align: left; }
          th { background: #f4f6f8; color: #475569; font-size: 10px; text-transform: uppercase; }
          th:last-child, td:last-child { text-align: right; white-space: nowrap; }
          .summary td { border: 0; padding: 3px 2px; } .summary .total td { padding-top: 8px; border-top: 1px solid #172033; font-size: 14px; }
          footer { margin-top: 15px; padding-top: 9px; border-top: 1px dashed #64748b; color: #475569; font-size: 11px; text-align: center; }
        </style></head><body>
          <header><h1>${escapeHtml(labDoc.name || labSlug || "Laboratory")}</h1><div class="branch">${escapeHtml(branchDoc.name || branchSlug || "-")}</div><div class="contact">${escapeHtml(branchDoc.address || labDoc.address || "-")} | ${escapeHtml(branchDoc.phone || "-")}</div></header>
          <div class="details"><div class="detail"><span class="label">Patient</span><span>${escapeHtml(order.name)}</span></div><div class="detail"><span class="label">Reference</span><span>${escapeHtml(order.transId)}</span></div><div class="detail"><span class="label">Issued</span><span>${escapeHtml(formatDate(orderDate))} ${escapeHtml(formatTime(orderDate))}</span></div></div>
          <table><thead><tr><th>Investigation</th><th>Amount</th></tr></thead><tbody>${testsHtml || "<tr><td>-</td><td>N0</td></tr>"}</tbody></table>
          <table class="summary"><tbody><tr><td>Total</td><td>${formatCurrency(total)}</td></tr><tr><td>Paid</td><td>${formatCurrency(paid)}</td></tr><tr class="total"><td>Balance Due</td><td>${formatCurrency(balance)}</td></tr></tbody></table>
          <footer>Thanks for your Patronage</footer>
        </body></html>`);
      receiptWindow.document.close();
      receiptWindow.focus();
      window.setTimeout(() => receiptWindow.print(), 350);
    } catch {
      receiptWindow.close();
    }
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Search
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Patient, test, or ID"
                    aria-label="Search test orders"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2 sm:w-56"
                  />
                </label>
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
                    <th className="px-4 py-3 text-left">Transaction ID</th>
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
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        Loading test orders...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        No matching test orders found for the selected date.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const orderDate = order.bDate || order.createdAt;
                      return (
                        <tr key={order._id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(orderDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTime(orderDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{order.transId || "-"}</td>
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
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => printReceipt(order)}
                                className="font-medium text-slate-700 hover:underline"
                              >
                                Print receipt
                              </button>
                              <Link href={`./test-orders/${order._id}`} className="font-medium text-blue-700 hover:underline">
                                View
                              </Link>
                            </div>
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
