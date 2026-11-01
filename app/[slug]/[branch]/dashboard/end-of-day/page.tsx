"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type PaymentRow = {
  _id: string;
  transactionId?: string;
  name?: string;
  user?: string;
  status?: string;
  amount?: number;
  payments?: Array<{ method?: string; amount?: number }>;
  businessDate?: string;
  createdAt?: string;
  branchId?: string;
};

type BillRow = {
  _id: string;
  patient?: string;
  transId?: string;
  tests?: string[];
  referrer?: string;
  billToName?: string;
  amount?: number;
  paid?: number;
  balance?: number;
  issuedCredit?: number;
  businessDate?: string;
};

type BillPaymentRow = {
  _id: string;
  patient?: string;
  referrer?: string;
  note?: string;
  billToName?: string;
  isInitialReceipt?: boolean;
  amount?: number;
  lines?: Array<{ method?: string; amount?: number }>;
  createdAt?: string;
};

type OrderRow = {
  _id: string;
  transId?: string;
  name?: string;
  patientName?: string;
  patientId?: string;
  referrer?: string;
  status?: string;
  revenue?: number;
  amountDue?: number;
  checkoutPaid?: number;
  checkoutCredit?: number;
  amountPaid?: number;
  bal?: number;
  discount?: number;
  amount?: number;
  bDate?: string;
  createdAt?: string;
};

type ExpensesResponse = {
  totalExpenses?: number;
  count?: number;
  expenses?: Array<{ amount?: number; paymentMethod?: string; description?: string; category?: string; note?: string; user?: string }>;
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

function isSameMonth(value: string | undefined, yearMonth: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 7) === yearMonth;
}

function isSameDay(value: string | undefined, ymd: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === ymd;
}

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${yearMonth}-${String(lastDay).padStart(2, "0")}` };
}

function matchesSearch(search: string, values: unknown[]) {
  if (!search.trim()) return true;
  const query = search.trim().toLocaleLowerCase();
  const contains = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(contains);
    return String(value || "").toLocaleLowerCase().includes(query);
  };
  return values.some(contains);
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

  const [periodMode, setPeriodMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showBankCashModal, setShowBankCashModal] = useState(false);
  const [bankCashForm, setBankCashForm] = useState({ amount: "", bankName: "", reference: "", note: "", businessDate: "" });
  const [bankCashError, setBankCashError] = useState("");
  const [bankCashSuccess, setBankCashSuccess] = useState("");
  const [bankingCash, setBankingCash] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [methodFiltering, setMethodFiltering] = useState(false);
  const methodFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const refreshCashMovements = async (resolvedBranchId: string) => {
    const periodParams = periodMode === "monthly"
      ? `from=${getMonthRange(selectedMonth).from}&to=${getMonthRange(selectedMonth).to}`
      : `date=${selectedDate}`;
    const response = await fetch(`/api/cash-movements?branchId=${encodeURIComponent(resolvedBranchId)}&${periodParams}`);
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
        const range = getMonthRange(selectedMonth);
        const periodParams = periodMode === "monthly"
          ? `from=${range.from}&to=${range.to}`
          : `date=${selectedDate}`;
        const branchRes = await fetch(`/api/branches/${branchSlug}?isCancelled=false`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch context");
        const branchDoc = await branchRes.json();

        const branchId = String(branchDoc._id || "");
        const labId = String(branchDoc.lab || branchDoc._id || "");
        setBranchId(branchId);

        const [paymentsRes, billsRes, billPaymentsRes, ordersRes, expensesRes, cashMovementsRes, closingRes] = await Promise.all([
          fetch(`/api/payments?branchId=${encodeURIComponent(branchId)}&isCancelled=false`),
          fetch(`/api/bill?branchId=${encodeURIComponent(branchId)}&${periodParams}&isCancelled=false`),
          fetch(`/api/bill-payments?branchId=${encodeURIComponent(branchId)}&${periodParams}&isCancelled=false`),
          fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}&isCancelled=false`),
          fetch(`/api/expenses?branchId=${encodeURIComponent(branchId)}&labId=${encodeURIComponent(labId)}&${periodParams}&isCancelled=false`),
          fetch(`/api/cash-movements?branchId=${encodeURIComponent(branchId)}&${periodParams}`),
          periodMode === "daily"
            ? fetch(`/api/end-of-day-closings?branchId=${encodeURIComponent(branchId)}&businessDate=${selectedDate}`)
            : Promise.resolve(null),
        ]);

        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];
        const billsData = billsRes.ok ? await billsRes.json() : [];
        const billPaymentsData = billPaymentsRes.ok ? await billPaymentsRes.json() : [];
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];
        const expensesData = expensesRes.ok ? await expensesRes.json() : { totalExpenses: 0, count: 0 };
        const cashMovementsData = cashMovementsRes.ok ? await cashMovementsRes.json() : [];
        const closingData = closingRes?.ok ? await closingRes.json() : null;

        const scopedPayments = Array.isArray(paymentsData)
          ? paymentsData.filter((p: PaymentRow) => {
              if (String(p.branchId || "") !== branchId) return false;
              return periodMode === "monthly"
                ? isSameMonth(p.businessDate || p.createdAt, selectedMonth)
                : isSameDay(p.businessDate || p.createdAt, selectedDate);
            })
          : [];

        const scopedOrders = Array.isArray(ordersData)
          ? ordersData.filter((o: OrderRow) => periodMode === "monthly"
              ? isSameMonth(o.bDate || o.createdAt, selectedMonth)
              : isSameDay(o.bDate || o.createdAt, selectedDate))
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
  }, [branchSlug, periodMode, selectedDate, selectedMonth]);

  const openBankCashModal = () => {
    setBankCashError("");
    setBankCashSuccess("");
    const today = new Date().toISOString().slice(0, 10);
    const businessDate = periodMode === "daily"
      ? selectedDate
      : today.startsWith(`${selectedMonth}-`) ? today : `${selectedMonth}-01`;
    setBankCashForm({ amount: "", bankName: "", reference: "", note: "", businessDate });
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
      setBankCashForm({ amount: "", bankName: "", reference: "", note: "", businessDate: "" });
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

  const methodOptions = useMemo(() => Array.from(new Set([
    ...payments.flatMap((row) => (row.payments || []).map((line) => String(line.method || "").trim().toLowerCase())),
    ...billPayments.flatMap((row) => (row.lines || []).map((line) => String(line.method || "").trim().toLowerCase())),
    ...(expenses.expenses || []).map((expense) => String(expense.paymentMethod || "").trim().toLowerCase()),
    ...(selectedMethod !== "all" ? [selectedMethod] : []),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b)), [payments, billPayments, expenses, selectedMethod]);

  const filteredPayments = useMemo(() => payments.filter((row) => {
    if (!matchesSearch(searchText, [row])) return false;
    return selectedMethod === "all" || (row.payments || []).some((line) => String(line.method || "").toLowerCase() === selectedMethod);
  }), [payments, searchText, selectedMethod]);
  const filteredBills = useMemo(() => bills.filter((row) => matchesSearch(searchText, [row])), [bills, searchText]);
  const filteredBillPayments = useMemo(() => billPayments.filter((row) => {
    if (!matchesSearch(searchText, [row])) return false;
    return selectedMethod === "all" || (row.lines || []).some((line) => String(line.method || "").toLowerCase() === selectedMethod);
  }), [billPayments, searchText, selectedMethod]);
  const filteredOrders = useMemo(() => orders.filter((row) => matchesSearch(searchText, [row])), [orders, searchText]);
  const filteredExpenses = useMemo(() => (expenses.expenses || []).filter((row) => {
    if (selectedMethod !== "all" && String(row.paymentMethod || "").toLowerCase() !== selectedMethod) return false;
    return matchesSearch(searchText, [row]);
  }), [expenses, searchText, selectedMethod]);
  const filteredCashMovements = useMemo(() => cashMovements.filter((row) => matchesSearch(searchText, [row])), [cashMovements, searchText]);

  const totals = useMemo(() => {
    const paymentMethodTotals = filteredPayments.reduce(
      (acc, row) => {
        if (!Array.isArray(row.payments)) return acc;
        for (const entry of row.payments) {
          const method = String(entry?.method || "").toLowerCase();
          const amount = Number(entry?.amount || 0);
          if (selectedMethod !== "all" && method !== selectedMethod) continue;
          if (!amount) continue;
          if (method === "cash") acc.cash += amount;
          else if (method === "pos") acc.pos += amount;
          else if (method === "transfer") acc.transfer += amount;
          else if (method === "other") acc.other += amount;
        }
        return acc;
      },
      { cash: 0, pos: 0, transfer: 0, other: 0 }
    );

    const billPaymentMethodTotals = filteredBillPayments.reduce(
      (acc, row) => {
        if (Array.isArray(row.lines) && row.lines.length > 0) {
          for (const entry of row.lines) {
            const method = String(entry?.method || '').toLowerCase();
            const amount = Number(entry?.amount || 0);
            if (selectedMethod !== "all" && method !== selectedMethod) continue;
            if (!amount) continue;
            if (method === 'cash') acc.cash += amount;
            else if (method === 'pos') acc.pos += amount;
            else if (method === 'transfer') acc.transfer += amount;
            else if (method === 'other') acc.other += amount;
          }
          return acc;
        }

        const fallbackAmount = Number(row.amount || 0);
        if (fallbackAmount && (selectedMethod === "all" || selectedMethod === "transfer")) {
          acc.transfer += fallbackAmount;
        }

        return acc;
      },
      { cash: 0, pos: 0, transfer: 0, other: 0 }
    );

    const totalPayment = filteredPayments.reduce((sum, row) => {
      const matchedLines = Array.isArray(row.payments)
        ? row.payments.filter((line) => selectedMethod === "all" || String(line.method || "").toLowerCase() === selectedMethod)
        : [];
      if (!matchedLines.length && selectedMethod === "all") return sum + Number(row.amount || 0);
      return sum + matchedLines.reduce((lineSum, line) => lineSum + Number(line.amount || 0), 0);
    }, 0);

    const totalBillPayment = filteredBillPayments.reduce((sum, row) => {
      const lines = Array.isArray(row.lines) ? row.lines.filter((line) => selectedMethod === "all" || String(line.method || "").toLowerCase() === selectedMethod) : [];
      return sum + (lines.length ? lines.reduce((lineSum, line) => lineSum + Number(line.amount || 0), 0) : selectedMethod === "all" ? Number(row.amount || 0) : 0);
    }, 0);

    const initialBillReceipts = filteredBillPayments.filter((row) => row.isInitialReceipt).reduce((sum, row) => {
      const lines = Array.isArray(row.lines) ? row.lines.filter((line) => selectedMethod === "all" || String(line.method || "").toLowerCase() === selectedMethod) : [];
      return sum + (lines.length ? lines.reduce((lineSum, line) => lineSum + Number(line.amount || 0), 0) : selectedMethod === "all" ? Number(row.amount || 0) : 0);
    }, 0);
    const checkoutCollected = selectedMethod === "all"
      ? filteredOrders.reduce((sum, row) => sum + Number(row.checkoutPaid ?? row.amountPaid ?? 0), 0)
      : totalPayment + initialBillReceipts;

    // Credit issued belongs to the sale's business date; current balance may
    // have changed because of receipts collected on later dates.
    const totalCredit = filteredOrders.reduce((sum, row) => sum + Number(row.checkoutCredit ?? row.bal ?? 0), 0);

    const totalRevenue = filteredOrders.reduce(
      (sum, row) => sum + Number(row.amountDue ?? Math.max(Number(row.amount || 0) - Number(row.discount || 0), 0)),
      0
    );
    const totalDiscounts = filteredOrders.reduce((sum, row) => sum + Number(row.discount || 0), 0);

    const totalExpenses = filteredExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const cashExpenses = filteredExpenses.reduce((total, expense) =>
      (selectedMethod === "all" || selectedMethod === "cash") && String(expense.paymentMethod || "").toLowerCase() === "cash"
        ? total + Number(expense.amount || 0)
        : total,
      0
    );
    const cashBanked = filteredCashMovements.reduce((total, movement) =>
      movement.type === "cash_to_bank" ? total + Number(movement.amount || 0) : total,
      0
    );
    const cashReturnedFromBank = filteredCashMovements.reduce((total, movement) =>
      movement.type === "bank_to_cash" ? total + Number(movement.amount || 0) : total,
      0
    );
    const cashReceived = paymentMethodTotals.cash + billPaymentMethodTotals.cash;
    const periodCashReceived = payments.reduce((total, row) => total + (row.payments || []).reduce((sum, line) =>
      String(line.method || "").toLowerCase() === "cash" ? sum + Number(line.amount || 0) : sum, 0), 0)
      + billPayments.reduce((total, row) => total + (row.lines || []).reduce((sum, line) =>
        String(line.method || "").toLowerCase() === "cash" ? sum + Number(line.amount || 0) : sum, 0), 0);
    const periodCashExpenses = (expenses?.expenses || []).reduce((sum, expense) =>
      String(expense.paymentMethod || "").toLowerCase() === "cash" ? sum + Number(expense.amount || 0) : sum, 0);
    const periodCashBanked = cashMovements.reduce((sum, movement) => movement.type === "cash_to_bank" ? sum + Number(movement.amount || 0) : sum, 0);
    const periodCashReturned = cashMovements.reduce((sum, movement) => movement.type === "bank_to_cash" ? sum + Number(movement.amount || 0) : sum, 0);
    const expectedCashAtHand = periodCashReceived - periodCashExpenses - periodCashBanked + periodCashReturned;

    return {
      totalPayment,
      totalBillPayment,
      checkoutCollected,
      totalCredit,
      totalRevenue,
      totalDiscounts,
      totalExpenses,
      cashExpenses,
      cashBanked,
      cashReturnedFromBank,
      cashReceived,
      expectedCashAtHand,
      periodCashReceived,
      periodCashExpenses,
      periodCashBanked,
      periodCashReturned,
      cash: paymentMethodTotals.cash,
      pos: paymentMethodTotals.pos,
      transfer: paymentMethodTotals.transfer,
      other: paymentMethodTotals.other,
      billPaymentCash: billPaymentMethodTotals.cash,
      billPaymentPos: billPaymentMethodTotals.pos,
      billPaymentTransfer: billPaymentMethodTotals.transfer,
      billPaymentOther: billPaymentMethodTotals.other,
    };
  }, [filteredPayments, filteredBillPayments, filteredBills, filteredOrders, filteredExpenses, filteredCashMovements, selectedMethod]);

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
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{periodMode === "daily" ? "End Of Day Summary" : "Monthly Finance Summary"}</h1>
              <p className="mt-1 text-sm text-slate-600">{periodMode === "daily" ? "Daily financial totals and cash reconciliation for this branch." : "Monthly totals for orders, collections, expenses, and cash movements."}</p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
              <div className="flex rounded-xl bg-slate-100 p-1" aria-label="Summary period">
                <button type="button" onClick={() => setPeriodMode("daily")} aria-pressed={periodMode === "daily"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${periodMode === "daily" ? "bg-white text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Daily</button>
                <button type="button" onClick={() => setPeriodMode("monthly")} aria-pressed={periodMode === "monthly"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${periodMode === "monthly" ? "bg-white text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Monthly</button>
              </div>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                {periodMode === "daily" ? "Date" : "Month"}
                {periodMode === "daily" ? (
                  <input type="date" value={selectedDate} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2 sm:w-auto" />
                ) : (
                  <input type="month" value={selectedMonth} onChange={(event) => { if (event.target.value) setSelectedMonth(event.target.value); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2 sm:w-auto" />
                )}
                {loading ? <span className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-blue-700" role="status" aria-live="polite"><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Updating summary…</span> : null}
              </label>
              <button
                type="button"
                onClick={() => periodMode === "daily" ? setSelectedDate(new Date().toISOString().slice(0, 10)) : setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {periodMode === "daily" ? "Today" : "This month"}
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

        <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Search this summary
            <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Patient, order, bill, bank, note..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Payment method
            <select value={selectedMethod} onChange={(event) => {
              setSelectedMethod(event.target.value);
              setMethodFiltering(true);
              if (methodFilterTimer.current) clearTimeout(methodFilterTimer.current);
              methodFilterTimer.current = setTimeout(() => setMethodFiltering(false), 300);
            }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All methods</option>
              {methodOptions.map((method) => <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>)}
            </select>
            {methodFiltering ? <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-700" role="status" aria-live="polite"><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Applying filter…</span> : null}
          </label>
          <button type="button" onClick={() => { setSearchText(""); setSelectedMethod("all"); }} disabled={!searchText && selectedMethod === "all"} className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Clear filters</button>
        </div>

        {bankCashSuccess ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bankCashSuccess}</div> : null}
        {closingSuccess ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{closingSuccess}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Payment (Payments)</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{formatCurrency(totals.totalPayment)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Total Bill Payments</p>
            <p className="mt-1 text-xl font-bold text-cyan-900">{formatCurrency(totals.totalBillPayment)}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Checkout Collected</p>
            <p className="mt-1 text-xl font-bold text-violet-900">{formatCurrency(totals.checkoutCollected)}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Credit Issued</p>
            <p className="mt-1 text-xl font-bold text-indigo-900">{formatCurrency(totals.totalCredit)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Revenue (Orders)</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatCurrency(totals.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Total Discounts</p>
            <p className="mt-1 text-xl font-bold text-rose-900">{formatCurrency(totals.totalDiscounts)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Expenses</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{formatCurrency(totals.totalExpenses)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Other Payments</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.other)}</p>
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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Bill Payments Other</p>
            <p className="mt-1 text-lg font-bold text-cyan-900">{formatCurrency(totals.billPaymentOther)}</p>
          </div>
        </div>

        {periodMode === "monthly" ? <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-950">Monthly Cash Reconciliation</h2>
          <p className="mt-1 text-sm text-emerald-800">Monthly cash activity includes every transaction in this period; search and payment-method filters do not change this reconciliation.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Received</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.periodCashReceived)}</p></div>
            <div className="rounded-xl bg-white/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Expenses</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.periodCashExpenses)}</p></div>
            <div className="rounded-xl bg-white/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net Bank Movement</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(totals.periodCashReturned - totals.periodCashBanked)}</p></div>
            <div className="rounded-xl bg-emerald-700 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Net Cash Activity</p><p className="mt-1 text-xl font-bold">{formatCurrency(totals.expectedCashAtHand)}</p></div>
          </div>
        </section> : <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-emerald-950">Daily Cash Reconciliation</h2>
            <p className="mt-1 text-sm text-emerald-800">Compare the physical cash count against the full day’s expected cash. Search and payment-method filters do not change the close calculation.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Actual Cash Counted</span><input type="number" min="0" step="0.01" value={actualCashCounted} onChange={(event) => setActualCashCounted(event.target.value)} placeholder="0.00" disabled={!!closing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <div className="rounded-xl border border-emerald-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Expected Cash At Hand</p><p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(totals.expectedCashAtHand)}</p></div>
            <div className={`rounded-xl border p-3 ${!hasActualCashCount ? "border-slate-200 bg-white" : cashDifference === 0 ? "border-emerald-200 bg-white" : cashDifference > 0 ? "border-blue-200 bg-white" : "border-rose-200 bg-white"}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cash Difference</p><p className="mt-1 text-lg font-bold text-slate-900">{hasActualCashCount ? `${cashDifference > 0 ? "+" : ""}${formatCurrency(cashDifference)}` : "-"}</p><p className="mt-1 text-xs font-semibold text-slate-600">{hasActualCashCount ? cashDifferenceStatus : "Enter cash count"}</p></div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-emerald-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{closing ? `Closed on ${formatDateTime(closing.closedAt)}` : "Daily cash count has not been saved."}</p>
            <button type="button" onClick={submitEndOfDayClosing} disabled={!!closing || !hasActualCashCount || closingEndOfDay || loading} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{closing ? "End Of Day Closed" : closingEndOfDay ? "Closing..." : "Close End Of Day"}</button>
          </div>
          {closingError ? <p className="mt-3 text-sm font-medium text-red-600">{closingError}</p> : null}
        </section>}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 md:px-5">
            <h2 className="text-lg font-semibold text-slate-900">Cash Movements</h2>
            <p className="mt-1 text-sm text-slate-600">{filteredCashMovements.length} matching cash movement{filteredCashMovements.length === 1 ? "" : "s"} {periodMode === "daily" ? `on ${selectedDate}` : `during ${new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}.</p>
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
                {filteredCashMovements.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No cash movements recorded for this date.</td></tr>
                ) : filteredCashMovements.map((movement) => {
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
                <td className="px-4 py-3 text-right text-slate-900">{filteredPayments.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Bills Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{filteredBills.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Bill Payments Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{filteredBillPayments.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Orders Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{filteredOrders.length}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">Expenses Entries</td>
                <td className="px-4 py-3 text-right text-slate-900">{filteredExpenses.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Loading end-of-day data...</div> : null}
        {error ? <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {showBankCashModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeBankCashModal}>
            <form onSubmit={submitBankCash} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(event) => event.stopPropagation()}>
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
                <label className="grid gap-1"><span className="text-sm font-medium text-slate-700">Business Date</span><input type="date" min={periodMode === "daily" ? selectedDate : `${selectedMonth}-01`} max={periodMode === "daily" ? selectedDate : getMonthRange(selectedMonth).to} value={bankCashForm.businessDate} onChange={(event) => setBankCashForm((form) => ({ ...form, businessDate: event.target.value }))} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
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
