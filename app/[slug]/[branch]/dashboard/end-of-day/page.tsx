"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type PaymentRow = {
  _id: string;
  amount?: number;
  payments?: Array<{ method?: string; amount?: number }>;
  businessDate?: string;
  createdAt?: string;
  branchId?: string;
};

type BillRow = {
  _id: string;
  amount?: number;
  paid?: number;
  balance?: number;
  businessDate?: string;
};

type BillPaymentRow = {
  _id: string;
  amount?: number;
  lines?: Array<{ method?: string; amount?: number }>;
  createdAt?: string;
};

type OrderRow = {
  _id: string;
  revenue?: number;
  amount?: number;
  bDate?: string;
  createdAt?: string;
};

type ExpensesResponse = {
  totalExpenses?: number;
  count?: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function isSameDay(value: string | undefined, ymd: string) {
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
}

export default function EndOfDayPage() {
  const pathname = usePathname();
  const parts = (pathname || "").split("/").filter(Boolean);
  const branchSlug = parts[1] || "";

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [billPayments, setBillPayments] = useState<BillPaymentRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpensesResponse>({ totalExpenses: 0, count: 0 });

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!branchSlug) {
        setError("Missing branch in URL");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const branchRes = await fetch(`/api/branches/${branchSlug}`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch context");
        const branchDoc = await branchRes.json();

        const branchId = String(branchDoc._id || "");
        const labId = String(branchDoc.lab || branchDoc._id || "");

        const [paymentsRes, billsRes, billPaymentsRes, ordersRes, expensesRes] = await Promise.all([
          fetch(`/api/payments`),
          fetch(`/api/bill?branchId=${encodeURIComponent(branchId)}&date=${selectedDate}`),
          fetch(`/api/bill-payments?branchId=${encodeURIComponent(branchId)}&date=${selectedDate}`),
          fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}`),
          fetch(`/api/expenses?branchId=${encodeURIComponent(branchId)}&labId=${encodeURIComponent(labId)}&date=${selectedDate}`),
        ]);

        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];
        const billsData = billsRes.ok ? await billsRes.json() : [];
        const billPaymentsData = billPaymentsRes.ok ? await billPaymentsRes.json() : [];
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];
        const expensesData = expensesRes.ok ? await expensesRes.json() : { totalExpenses: 0, count: 0 };

        const scopedPayments = Array.isArray(paymentsData)
          ? paymentsData.filter((p: PaymentRow) => {
              if (String(p.branchId || "") !== branchId) return false;
              return isSameDay(p.businessDate || p.createdAt, selectedDate);
            })
          : [];

        const scopedOrders = Array.isArray(ordersData)
          ? ordersData.filter((o: OrderRow) => isSameDay(o.bDate || o.createdAt, selectedDate))
          : [];

        if (!mounted) return;
        setPayments(scopedPayments);
        setBills(Array.isArray(billsData) ? billsData : []);
        setBillPayments(Array.isArray(billPaymentsData) ? billPaymentsData : []);
        setOrders(scopedOrders);
        setExpenses(expensesData || { totalExpenses: 0, count: 0 });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load end-of-day summary");
        setPayments([]);
        setBills([]);
        setBillPayments([]);
        setOrders([]);
        setExpenses({ totalExpenses: 0, count: 0 });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [branchSlug, selectedDate]);

  const totals = useMemo(() => {
    const paymentMethodTotals = payments.reduce(
      (acc, row) => {
        if (!Array.isArray(row.payments)) return acc;
        for (const entry of row.payments) {
          const method = String(entry?.method || "").toLowerCase();
          const amount = Number(entry?.amount || 0);
          if (!amount) continue;
          if (method === "cash") acc.cash += amount;
          else if (method === "pos") acc.pos += amount;
          else if (method === "transfer") acc.transfer += amount;
        }
        return acc;
      },
      { cash: 0, pos: 0, transfer: 0 }
    );

    const billPaymentMethodTotals = billPayments.reduce(
      (acc, row) => {
        if (Array.isArray(row.lines) && row.lines.length > 0) {
          for (const entry of row.lines) {
            const method = String(entry?.method || '').toLowerCase();
            const amount = Number(entry?.amount || 0);
            if (!amount) continue;
            if (method === 'cash') acc.cash += amount;
            else if (method === 'pos') acc.pos += amount;
            else if (method === 'transfer') acc.transfer += amount;
          }
          return acc;
        }

        const fallbackAmount = Number(row.amount || 0);
        if (fallbackAmount) {
          acc.transfer += fallbackAmount;
        }

        return acc;
      },
      { cash: 0, pos: 0, transfer: 0 }
    );

    const totalPayment = payments.reduce((sum, row) => {
      const topAmount = Number(row.amount || 0);
      if (topAmount > 0) return sum + topAmount;
      const nested = Array.isArray(row.payments)
        ? row.payments.reduce((s, p) => s + Number(p?.amount || 0), 0)
        : 0;
      return sum + nested;
    }, 0);

    const totalBillPayment = billPayments.reduce((sum, row) => {
      const byAmount = Number(row.amount || 0);
      if (byAmount > 0) return sum + byAmount;
      const byLines = Array.isArray(row.lines)
        ? row.lines.reduce((s, line) => s + Number(line?.amount || 0), 0)
        : 0;
      return sum + byLines;
    }, 0);

    const totalCredit = bills.reduce((sum, row) => sum + Number(row.balance || 0), 0);

    const totalRevenue = orders.reduce(
      (sum, row) => sum + Number(row.revenue ?? row.amount ?? 0),
      0
    );

    const totalExpenses = Number(expenses?.totalExpenses || 0);

    return {
      totalPayment,
      totalBillPayment,
      totalCredit,
      totalRevenue,
      totalExpenses,
      cash: paymentMethodTotals.cash,
      pos: paymentMethodTotals.pos,
      transfer: paymentMethodTotals.transfer,
      billPaymentCash: billPaymentMethodTotals.cash,
      billPaymentPos: billPaymentMethodTotals.pos,
      billPaymentTransfer: billPaymentMethodTotals.transfer,
    };
  }, [payments, billPayments, bills, orders, expenses]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Finance Summary</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">End Of Day</h1>
              <p className="mt-1 text-sm text-slate-600">Daily financial totals for the selected branch date.</p>
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Payment (Payments)</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{formatCurrency(totals.totalPayment)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Total Bill Payments</p>
            <p className="mt-1 text-xl font-bold text-cyan-900">{formatCurrency(totals.totalBillPayment)}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total Credit (Bills)</p>
            <p className="mt-1 text-xl font-bold text-indigo-900">{formatCurrency(totals.totalCredit)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Revenue (Orders)</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatCurrency(totals.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Expenses</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{formatCurrency(totals.totalExpenses)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Cash</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.cash)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total POS</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.pos)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Transfer</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.transfer)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Bill Payments Cash</p>
            <p className="mt-1 text-lg font-bold text-cyan-900">{formatCurrency(totals.billPaymentCash)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Bill Payments POS</p>
            <p className="mt-1 text-lg font-bold text-cyan-900">{formatCurrency(totals.billPaymentPos)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Bill Payments Transfer</p>
            <p className="mt-1 text-lg font-bold text-cyan-900">{formatCurrency(totals.billPaymentTransfer)}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Payments Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{payments.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Bills Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{bills.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Bill Payments Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{billPayments.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Orders Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{orders.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Expenses Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{Number(expenses?.count || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Loading end-of-day data...</div> : null}
        {error ? <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>
    </div>
  );
}
