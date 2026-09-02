"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Payment {
  _id: string;
  amount: number;
 name?: string;
  userId?: string;
  branch?: string;
  branchId?: string;
  patient?: string;
  user?: string;
  slug?: string;
  transactionId?: string;
  businessDate?: string;
  status?: string;
  createdAt?: string;
}

export default function PaymentsPage() {
  const pathname = usePathname();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

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

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1];
        if (!branch) throw new Error("Branch not found in URL");

        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch info");
        const branchDoc = await branchRes.json();
        const branchId = branchDoc._id;

        const res = await fetch(`/api/payments?branchId=${encodeURIComponent(branchId)}`);
        if (!res.ok) throw new Error("Failed to fetch payments");
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : [data]);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (pathname) fetchPayments();
  }, [pathname]);

  const filteredPayments = useMemo(
    () => payments.filter((payment) => isSameDay(payment.businessDate || payment.createdAt, selectedDate)),
    [payments, selectedDate]
  );

  const totals = useMemo(
    () =>
      filteredPayments.reduce(
        (acc, payment) => {
          if (Array.isArray((payment as any).payments)) {
            for (const p of (payment as any).payments) {
              acc.totalPayment += Number(p.amount || 0);
              if (p.method === "cash") acc.totalCash += Number(p.amount || 0);
              if (p.method === "pos") acc.totalPos += Number(p.amount || 0);
              if (p.method === "transfer") acc.totalTransfer += Number(p.amount || 0);
            }
          }
          return acc;
        },
        { totalPayment: 0, totalCash: 0, totalPos: 0, totalTransfer: 0 }
      ),
    [filteredPayments]
  );

  return (
    <>
    <Navbar/>
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 mb-0">Payments</h1>
          <p className="text-sm text-slate-600">View branch payments by date.</p>
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap gap-2 md:gap-4">
            <div className="bg-blue-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Payment</div>
              <div className="text-base font-bold text-blue-900">{formatCurrency(totals.totalPayment)}</div>
            </div>
            <div className="bg-green-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Cash</div>
              <div className="text-base font-bold text-green-700">{formatCurrency(totals.totalCash)}</div>
            </div>
            <div className="bg-yellow-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total POS</div>
              <div className="text-base font-bold text-yellow-700">{formatCurrency(totals.totalPos)}</div>
            </div>
            <div className="bg-purple-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Transfer</div>
              <div className="text-base font-bold text-purple-700">{formatCurrency(totals.totalTransfer)}</div>
            </div>
          </div>
        )}
      </div>
      <div className="mb-4 flex items-end gap-2">
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
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto rounded shadow bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Transaction ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Payments</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">User</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment, idx) => {
                // Render payments as a comma-separated list of method: amount
                let paymentsDisplay = "-";
                if (Array.isArray((payment as any).payments) && (payment as any).payments.length > 0) {
                  paymentsDisplay = (payment as any).payments.map((p: any) => `${p.method}: ₦${p.amount?.toLocaleString()}`).join(", ");
                }
                return (
                  <tr key={payment._id} className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100`}>
                    <td className="px-4 py-2 text-sm font-mono">{payment.transactionId || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{payment.name || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{paymentsDisplay}</td>
                    <td className="px-4 py-2 text-sm">{payment.user || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(payment.businessDate || payment.createdAt)}</td>
                    <td className="px-4 py-2 text-sm">{formatTime(payment.businessDate || payment.createdAt)}</td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">No payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
                  </>
  );
}
