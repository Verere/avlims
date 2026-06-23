"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type BillRow = {
  _id: string;
  labId?: string;
  branchId?: string;
  orderId?: string;
  patient?: string;
  referrer?: string;
  billTo?: string;
  amount?: number;
  paid?: number;
  balance?: number;
  businessDate?: string;
  billToName?: string;
  billToRef?: string;
  isSettled?: boolean;
};

type PaymentMethod = "cash" | "transfer" | "pos" | "other";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [activeBill, setActiveBill] = useState<BillRow | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payReference, setPayReference] = useState<string>("");
  const [payNote, setPayNote] = useState<string>("");
  const [paying, setPaying] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>("");

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

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (bill) =>
        (bill.patient || "").toLowerCase().includes(q) ||
        (bill.billToName || "").toLowerCase().includes(q) ||
        (bill.billTo || "").toLowerCase().includes(q)
    );
  }, [bills, searchQuery]);

  const totals = useMemo(() => {
    return filteredBills.reduce(
      (acc, bill) => {
        acc.amount += Number(bill.amount || 0);
        acc.paid += Number(bill.paid || 0);
        acc.balance += Number(bill.balance || 0);
        return acc;
      },
      { amount: 0, paid: 0, balance: 0 }
    );
  }, [filteredBills]);

  const openPaymentModal = (bill: BillRow) => {
    setActiveBill(bill);
    setPayAmount(String(Number(bill.balance || 0)));
    setPayMethod("cash");
    setPayReference("");
    setPayNote("");
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (paying) return;
    setShowPaymentModal(false);
    setActiveBill(null);
    setPaymentError("");
  };

  const submitBillPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeBill) return;

    const amount = Number(payAmount || 0);
    const balance = Number(activeBill.balance || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    if (amount > balance) {
      setPaymentError("Payment amount cannot be greater than outstanding balance.");
      return;
    }

    setPaying(true);
    setPaymentError("");

    try {
      let sessionUserId = "";
      let sessionUserName = "";
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          sessionUserId = String(session?.user?.id || "");
          sessionUserName = String(session?.user?.name || "");
        }
      } catch {
        sessionUserId = "";
        sessionUserName = "";
      }

      const res = await fetch("/api/bill-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: activeBill._id,
          amount,
          method: payMethod,
          reference: payReference.trim() || undefined,
          note: payNote.trim() || undefined,
          userId: sessionUserId || undefined,
          user: sessionUserName || "system",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create bill payment");
      }

      const updated = data?.bill;
      if (updated?._id) {
        setBills((prev) => prev.map((bill) => (bill._id === updated._id ? { ...bill, ...updated } : bill)));
      }

      setShowPaymentModal(false);
      setActiveBill(null);
      setPaymentError("");
    } catch (err: any) {
      setPaymentError(err?.message || "Failed to process payment.");
    } finally {
      setPaying(false);
    }
  };

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
 <div className="mb-3">
          <input
            type="text"
            placeholder="Search by patient or bill-to..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-blue-500 transition focus:ring-2"
          />
        </div>
            <div className="flex flex-wrap items-end gap-2">
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
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Loading bills...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      {searchQuery.trim() ? "No bills match your search." : "No bills found for the selected date."}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(bill.businessDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{bill.patient || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{bill.referrer || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{bill.billToName || bill.billTo || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(Number(bill.amount || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(Number(bill.paid || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">{formatCurrency(Number(bill.balance || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openPaymentModal(bill)}
                          disabled={Number(bill.balance || 0) <= 0}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {Number(bill.balance || 0) <= 0 ? "Paid" : "Payment"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showPaymentModal && activeBill && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
            onClick={closePaymentModal}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill Payment</p>
                  <h2 className="text-lg font-bold text-slate-900">Receive Payment</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeBill.patient || "-"} • {activeBill.billToName || activeBill.billTo || "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">Amount</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(Number(activeBill.amount || 0))}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">Balance</div>
                  <div className="font-semibold text-amber-700">{formatCurrency(Number(activeBill.balance || 0))}</div>
                </div>
              </div>

              <form onSubmit={submitBillPayment} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount to Pay</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                    <option value="pos">POS</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reference (optional)</label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                    placeholder="Transaction reference"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
                  <textarea
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                    placeholder="Add note"
                  />
                </div>

                {paymentError && <p className="text-sm font-medium text-red-600">{paymentError}</p>}

                <button
                  type="submit"
                  disabled={paying}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {paying ? "Processing..." : "Confirm Payment"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
