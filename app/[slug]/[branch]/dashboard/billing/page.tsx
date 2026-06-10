"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type BillRow = {
  _id: string;
  patient?: string;
  referrer?: string;
  billTo?: string;
  amount?: number;
  paid?: number;
  balance?: number;
  businessDate?: string;
  billToName?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchBranchBySlug(branchSlug: string) {
  const res = await fetch(`/api/branches/${branchSlug}`);
  if (!res.ok) throw new Error("Branch not found");
  return res.json();
}

async function fetchBills(branchId: string, date: string) {
  const query = new URLSearchParams({ branchId, date }).toString();
  const res = await fetch(`/api/bill?${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch bills" }));
    throw new Error(err.error || "Failed to fetch bills");
  }
  return res.json();
}

export default function DashboardBillingPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branchSlug = pathParts[1] || "";

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!branchSlug) {
        setError("Missing branch in URL");
        setBills([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const branchDoc = await fetchBranchBySlug(branchSlug);
        const data = await fetchBills(branchDoc._id, selectedDate);
        if (!isMounted) return;
        setBills(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to fetch bills");
        setBills([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [branchSlug, selectedDate]);

  const totals = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        acc.amount += Number(bill.amount || 0);
        acc.paid += Number(bill.paid || 0);
        acc.balance += Number(bill.balance || 0);
        return acc;
      },
      { amount: 0, paid: 0, balance: 0 }
    );
  }, [bills]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billing</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Branch Bills</h1>
              <p className="mt-1 text-sm text-slate-600">View all bills for this branch by date.</p>
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

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Amount</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.amount)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Paid</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(totals.paid)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Balance</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(totals.balance)}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">Bill To</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Loading bills...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No bills found for the selected date.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(bill.businessDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{bill.patient || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{bill.referrer || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{bill.billToName || bill.billTo || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(Number(bill.amount || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(Number(bill.paid || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">{formatCurrency(Number(bill.balance || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
