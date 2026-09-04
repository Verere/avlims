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
  expenses?: Array<{ amount?: number; paymentMethod?: string }>;
};

type CashMovementRow = {
  _id: string;
  amount?: number;
  type?: "cash_to_bank" | "bank_to_cash";
  bankName?: string;
  reference?: string;
  note?: string;
  businessDate?: string;
  createdAt?: string;
  createdBy?: string | { name?: string; email?: string };
};

type EndOfDayClosing = {
  _id: string;
  expectedCashAtHand: number;
  actualCashCounted: number;
  cashDifference: number;
  status: "balanced" | "cash_over" | "cash_short";
  closedAt: string;
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

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function EndOfDayPage() {
  const pathname = usePathname();
  const parts = (pathname || "").split("/").filter(Boolean);
  const branchSlug = parts[1] || "";

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showBankCashModal, setShowBankCashModal] = useState(false);
  const [bankCashForm, setBankCashForm] = useState({ amount: "", bankName: "", reference: "", note: "", businessDate: "" });
  const [bankCashError, setBankCashError] = useState("");
  const [bankCashSuccess, setBankCashSuccess] = useState("");
  const [bankingCash, setBankingCash] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState("");
  const [closing, setClosing] = useState<EndOfDayClosing | null>(null);
  const [closingEndOfDay, setClosingEndOfDay] = useState(false);
  const [closingError, setClosingError] = useState("");
  const [closingSuccess, setClosingSuccess] = useState("");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [billPayments, setBillPayments] = useState<BillPaymentRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpensesResponse>({ totalExpenses: 0, count: 0 });
  const [cashMovements, setCashMovements] = useState<CashMovementRow[]>([]);

  const refreshCashMovements = async (resolvedBranchId: string, businessDate = selectedDate) => {
    const response = await fetch(`/api/cash-movements?branchId=${encodeURIComponent(resolvedBranchId)}&date=${businessDate}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to load cash movements" }));
      throw new Error(payload.error || "Failed to load cash movements");
    }
    const data = await response.json();
    setCashMovements(Array.isArray(data) ? data : []);
  };

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
        const branchRes = await fetch(`/api/branches/${branchSlug}?isCancelled=false`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch context");
        const branchDoc = await branchRes.json();

        const branchId = String(branchDoc._id || "");
        const labId = String(branchDoc.lab || branchDoc._id || "");
        setBranchId(branchId);

        const [paymentsRes, billsRes, billPaymentsRes, ordersRes, expensesRes, cashMovementsRes, closingRes] = await Promise.all([
          fetch(`/api/payments?isCancelled=false`),
          fetch(`/api/bill?branchId=${encodeURIComponent(branchId)}&date=${selectedDate}&isCancelled=false`),
          fetch(`/api/bill-payments?branchId=${encodeURIComponent(branchId)}&date=${selectedDate}&isCancelled=false`),
          fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}&isCancelled=false`),
          fetch(`/api/expenses?branchId=${encodeURIComponent(branchId)}&labId=${encodeURIComponent(labId)}&date=${selectedDate}&isCancelled=false`),
          fetch(`/api/cash-movements?branchId=${encodeURIComponent(branchId)}&date=${selectedDate}`),
          fetch(`/api/end-of-day-closings?branchId=${encodeURIComponent(branchId)}&businessDate=${selectedDate}`),
        ]);

        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];
        const billsData = billsRes.ok ? await billsRes.json() : [];
        const billPaymentsData = billPaymentsRes.ok ? await billPaymentsRes.json() : [];
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];
        const expensesData = expensesRes.ok ? await expensesRes.json() : { totalExpenses: 0, count: 0 };
        const cashMovementsData = cashMovementsRes.ok ? await cashMovementsRes.json() : [];
        const closingData = closingRes.ok ? await closingRes.json() : null;

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
        setCashMovements(Array.isArray(cashMovementsData) ? cashMovementsData : []);
        setClosing(closingData);
        setActualCashCounted(closingData ? String(closingData.actualCashCounted) : "");
        setClosingError("");
        setClosingSuccess("");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load end-of-day summary");
        setPayments([]);
        setBills([]);
        setBillPayments([]);
        setOrders([]);
        setExpenses({ totalExpenses: 0, count: 0 });
        setCashMovements([]);
        setClosing(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [branchSlug, selectedDate]);

  const openBankCashModal = () => {
    setBankCashError("");
    setBankCashSuccess("");
    setBankCashForm({ amount: "", bankName: "", reference: "", note: "", businessDate: selectedDate });
    setShowBankCashModal(true);
  };

  const closeBankCashModal = () => {
    if (bankingCash) return;
    setShowBankCashModal(false);
    setBankCashError("");
  };

  const submitBankCash = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(bankCashForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBankCashError("Enter an amount greater than zero.");
      return;
    }
    if (!branchId) {
      setBankCashError("Branch context is unavailable.");
      return;
    }

    setBankingCash(true);
    setBankCashError("");
    try {
      const response = await fetch("/api/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          type: "cash_to_bank",
          amount,
          bankName: bankCashForm.bankName.trim() || undefined,
          reference: bankCashForm.reference.trim() || undefined,
          note: bankCashForm.note.trim() || undefined,
          businessDate: bankCashForm.businessDate,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to record bank deposit");

      await refreshCashMovements(branchId);
      setShowBankCashModal(false);
      setBankCashForm({ amount: "", bankName: "", reference: "", note: "", businessDate: selectedDate });
      setBankCashSuccess("Cash banked successfully.");
    } catch (submitError: any) {
      setBankCashError(submitError?.message || "Failed to record bank deposit");
    } finally {
      setBankingCash(false);
    }
  };

  const submitEndOfDayClosing = async () => {
    const actualAmount = Number(actualCashCounted);
    if (!Number.isFinite(actualAmount) || actualAmount < 0) {
      setClosingError("Enter a valid actual cash count.");
      return;
    }
    if (!branchId) {
      setClosingError("Branch context is unavailable.");
      return;
    }

    setClosingEndOfDay(true);
    setClosingError("");
    try {
      const response = await fetch("/api/end-of-day-closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, businessDate: selectedDate, actualCashCounted: actualAmount }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to close End Of Day");
      setClosing(payload);
      setActualCashCounted(String(payload.actualCashCounted));
      setClosingSuccess("End Of Day closed successfully.");
    } catch (submitError: any) {
      setClosingError(submitError?.message || "Failed to close End Of Day");
    } finally {
      setClosingEndOfDay(false);
    }
  };

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
    const cashExpenses = (expenses?.expenses || []).reduce((total, expense) =>
      String(expense.paymentMethod || "").toLowerCase() === "cash"
        ? total + Number(expense.amount || 0)
        : total,
      0
    );
    const cashBanked = cashMovements.reduce((total, movement) =>
      movement.type === "cash_to_bank" ? total + Number(movement.amount || 0) : total,
      0
    );
    const cashReturnedFromBank = cashMovements.reduce((total, movement) =>
      movement.type === "bank_to_cash" ? total + Number(movement.amount || 0) : total,
      0
    );
    const cashReceived = paymentMethodTotals.cash + billPaymentMethodTotals.cash;
    const expectedCashAtHand = cashReceived - cashExpenses - cashBanked + cashReturnedFromBank;

    return {
      totalPayment,
      totalBillPayment,
      totalCredit,
      totalRevenue,
      totalExpenses,
      cashExpenses,
      cashBanked,
      cashReturnedFromBank,
      cashReceived,
      expectedCashAtHand,
      cash: paymentMethodTotals.cash,
      pos: paymentMethodTotals.pos,
      transfer: paymentMethodTotals.transfer,
      billPaymentCash: billPaymentMethodTotals.cash,
      billPaymentPos: billPaymentMethodTotals.pos,
      billPaymentTransfer: billPaymentMethodTotals.transfer,
    };
  }, [payments, billPayments, bills, orders, expenses, cashMovements]);

  const actualCashAmount = Number(actualCashCounted);
  const hasActualCashCount = actualCashCounted.trim() !== "" && Number.isFinite(actualCashAmount);
  const cashDifference = hasActualCashCount ? actualCashAmount - totals.expectedCashAtHand : 0;
  const cashDifferenceStatus = cashDifference === 0 ? "Balanced" : cashDifference > 0 ? "Cash Over" : "Cash Short";

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
              <button
                type="button"
                onClick={openBankCashModal}
                disabled={loading || !branchId}
                className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Bank Cash
              </button>
            </div>
          </div>
        </div>

        {bankCashSuccess ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bankCashSuccess}</div> : null}
        {closingSuccess ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{closingSuccess}</div> : null}

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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Received</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.cashReceived)}</p>
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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Cash Expenses</p>
            <p className="mt-1 text-lg font-bold text-rose-900">{formatCurrency(totals.cashExpenses)}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cash Banked</p>
            <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.cashBanked)}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Cash Returned From Bank</p>
            <p className="mt-1 text-lg font-bold text-violet-900">{formatCurrency(totals.cashReturnedFromBank)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Expected Cash At Hand</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatCurrency(totals.expectedCashAtHand)}</p>
            <p className="mt-1 text-xs text-emerald-700">Cash received less cash expenses and banked cash, plus cash returned from bank.</p>
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

        <section className="mt-6 border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Actual Cash Count</h2>
            <p className="mt-1 text-sm text-slate-600">Compare the cash physically counted with the expected cash on hand.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Actual Cash Counted</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={actualCashCounted}
                onChange={(event) => setActualCashCounted(event.target.value)}
                placeholder="0.00"
                disabled={!!closing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Expected Cash At Hand</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(totals.expectedCashAtHand)}</p>
            </div>
            <div className={`border p-3 ${!hasActualCashCount ? "border-slate-200 bg-slate-50" : cashDifference === 0 ? "border-emerald-200 bg-emerald-50" : cashDifference > 0 ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${!hasActualCashCount ? "text-slate-600" : cashDifference === 0 ? "text-emerald-700" : cashDifference > 0 ? "text-blue-700" : "text-rose-700"}`}>Cash Difference</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{hasActualCashCount ? `${cashDifference > 0 ? "+" : ""}${formatCurrency(cashDifference)}` : "-"}</p>
              <p className={`mt-1 text-xs font-semibold ${!hasActualCashCount ? "text-slate-500" : cashDifference === 0 ? "text-emerald-700" : cashDifference > 0 ? "text-blue-700" : "text-rose-700"}`}>{hasActualCashCount ? cashDifferenceStatus : "Enter cash count"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{closing ? `Closed on ${formatDateTime(closing.closedAt)}` : "Actual cash count is not yet saved."}</p>
            <button
              type="button"
              onClick={submitEndOfDayClosing}
              disabled={!!closing || !hasActualCashCount || closingEndOfDay || loading}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {closing ? "End Of Day Closed" : closingEndOfDay ? "Closing..." : "Close End Of Day"}
            </button>
          </div>
          {closingError ? <p className="mt-3 text-sm font-medium text-red-600">{closingError}</p> : null}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 md:px-5">
            <h2 className="text-lg font-semibold text-slate-900">Cash Movements</h2>
            <p className="mt-1 text-sm text-slate-600">Cash transfers recorded for the selected business date.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date/Time</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Bank</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Note</th>
                  <th className="px-4 py-3 text-left">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashMovements.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No cash movements recorded for this date.</td></tr>
                ) : cashMovements.map((movement) => {
                  const isCashBanked = movement.type === "cash_to_bank";
                  const creator = typeof movement.createdBy === "object"
                    ? movement.createdBy.name || movement.createdBy.email
                    : movement.createdBy;
                  return (
                    <tr key={movement._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTime(movement.createdAt || movement.businessDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isCashBanked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {isCashBanked ? "Cash Banked" : "Cash Returned"}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${isCashBanked ? "text-rose-700" : "text-emerald-700"}`}>
                        {isCashBanked ? "-" : "+"}{formatCurrency(Number(movement.amount || 0))}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{movement.bankName || "-"}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{movement.reference || "-"}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-700">{movement.note || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{creator || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">Total Cash Banked</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700">-{formatCurrency(totals.cashBanked)}</td>
                  <td colSpan={4} />
                </tr>
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">Total Cash Returned</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">+{formatCurrency(totals.cashReturnedFromBank)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

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

        {showBankCashModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeBankCashModal}>
            <form onSubmit={submitBankCash} className="w-full max-w-md bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Movement</p>
                  <h2 className="text-xl font-bold text-slate-900">Bank Cash</h2>
                </div>
                <button type="button" onClick={closeBankCashModal} disabled={bankingCash} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Close</button>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Amount</span><input type="number" min="0.01" step="0.01" value={bankCashForm.amount} onChange={(event) => setBankCashForm((form) => ({ ...form, amount: event.target.value }))} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Bank Name</span><input type="text" value={bankCashForm.bankName} onChange={(event) => setBankCashForm((form) => ({ ...form, bankName: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Deposit Reference</span><input type="text" value={bankCashForm.reference} onChange={(event) => setBankCashForm((form) => ({ ...form, reference: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Note</span><textarea rows={3} value={bankCashForm.note} onChange={(event) => setBankCashForm((form) => ({ ...form, note: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Business Date</span><input type="date" value={bankCashForm.businessDate} onChange={(event) => setBankCashForm((form) => ({ ...form, businessDate: event.target.value }))} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              </div>
              {bankCashError ? <p className="mt-4 text-sm font-medium text-red-600">{bankCashError}</p> : null}
              <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeBankCashModal} disabled={bankingCash} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={bankingCash} className="bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{bankingCash ? "Saving..." : "Record Deposit"}</button></div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
