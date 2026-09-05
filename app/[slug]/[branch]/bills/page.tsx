"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

type BillRow = {
  _id: string;
  transId?: string;
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

function formatLetterDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function numberToWords(value: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const toWordsUnderThousand = (number: number): string => {
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
    return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${toWordsUnderThousand(number % 100)}` : ""}`;
  };

  const wholeNumber = Math.floor(Math.max(0, value));
  if (wholeNumber === 0) return "Zero";
  const groups = [
    { divisor: 1_000_000_000, label: "Billion" },
    { divisor: 1_000_000, label: "Million" },
    { divisor: 1_000, label: "Thousand" },
  ];
  let remainder = wholeNumber;
  const parts: string[] = [];
  for (const group of groups) {
    const groupValue = Math.floor(remainder / group.divisor);
    if (groupValue) {
      parts.push(`${toWordsUnderThousand(groupValue)} ${group.label}`);
      remainder %= group.divisor;
    }
  }
  if (remainder) parts.push(toWordsUnderThousand(remainder));
  return parts.join(" ");
}

async function fetchBranchBySlug(branchSlug: string) {
  const res = await fetch(`/api/branches/${branchSlug}`);
  if (!res.ok) throw new Error("Branch not found");
  return res.json();
}

async function fetchBills(branchId: string, from: string, to: string) {
  const query = new URLSearchParams({ branchId, from, to }).toString();
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

  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bills, setBills] = useState<BillRow[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
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
  const [showBillLetter, setShowBillLetter] = useState(false);

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
        const data = await fetchBills(branchDoc._id, fromDate, toDate);
        if (!isMounted) return;
        setBills(Array.isArray(data) ? data : []);
        setSelectedBillIds([]);
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
  }, [branchSlug, fromDate, toDate]);

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

  const allVisibleBillsSelected = filteredBills.length > 0 && filteredBills.every((bill) => selectedBillIds.includes(bill._id));

  const toggleBillSelection = (billId: string) => {
    setSelectedBillIds((current) => current.includes(billId)
      ? current.filter((id) => id !== billId)
      : [...current, billId]
    );
  };

  const toggleVisibleBills = () => {
    const visibleBillIds = filteredBills.map((bill) => bill._id);
    setSelectedBillIds((current) => allVisibleBillsSelected
      ? current.filter((id) => !visibleBillIds.includes(id))
      : Array.from(new Set([...current, ...visibleBillIds]))
    );
  };

  const selectedBills = bills.filter((bill) => selectedBillIds.includes(bill._id));
  const selectedBillToRecipients = Array.from(new Set(selectedBills.map((bill) => bill.billToName || bill.billTo).filter(Boolean)));
  const selectedBillsTotal = selectedBills.reduce((total, bill) => total + Number(bill.balance ?? bill.amount ?? 0), 0);
  const canGenerateBillLetter = selectedBills.length > 0 && selectedBillToRecipients.length === 1;
  const periodLabel = fromDate === toDate
    ? formatDate(fromDate)
    : `${formatDate(fromDate)} to ${formatDate(toDate)}`;

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
            <Navbar />
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billing</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Branch Bills</h1>
              <p className="mt-1 text-sm text-slate-600">View all bills for this branch by date range.</p>
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
                From
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                To
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setFromDate(today);
                  setToDate(today);
                }}
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
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{selectedBills.length} bill{selectedBills.length === 1 ? "" : "s"} selected</p>
            <button
              type="button"
              disabled={!canGenerateBillLetter}
              onClick={() => setShowBillLetter(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              title={selectedBills.length === 0 ? "Select one or more bills first" : selectedBillToRecipients.length > 1 ? "Select bills for one bill-to recipient at a time" : "Generate selected bills letter"}
            >
              Send Bills
            </button>
          </div>
          {selectedBills.length > 0 && selectedBillToRecipients.length > 1 ? <p className="mt-2 text-sm text-amber-700">Select bills for one bill-to recipient at a time.</p> : null}
        </div>

       

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleBillsSelected}
                      onChange={toggleVisibleBills}
                      aria-label="Select all visible bills"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Transaction ID</th>
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
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      Loading bills...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      {searchQuery.trim() ? "No bills match your search." : "No bills found for the selected date range."}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBillIds.includes(bill._id)}
                          onChange={() => toggleBillSelection(bill._id)}
                          aria-label={`Select bill ${bill.transId || bill._id}`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(bill.businessDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{bill.transId || "-"}</td>
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

        {showBillLetter && canGenerateBillLetter ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowBillLetter(false)}>
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Bills</p>
                  <h2 className="text-xl font-bold text-slate-900">Bill Letter</h2>
                </div>
                <button type="button" onClick={() => setShowBillLetter(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Close</button>
              </div>
              <article className="space-y-5 border border-slate-200 p-6 text-sm leading-7 text-slate-800">
                <p>{formatLetterDate(new Date())}</p>
                <div><p>The Manager,</p><p>{selectedBillToRecipients[0]},</p><p>Ughelli,</p><p>Delta State.</p></div>
                <p>Sir,</p>
                <p className="font-bold uppercase">Bill for medical investigations done for your clients from {periodLabel}</p>
                <p>Please find the medical investigation bill of your clients done in <strong>RESONANCE MEDICAL DIAGNOSTICS LTD, UGHELLI</strong> from {periodLabel}.</p>
                <p>The total cost of the investigations is <strong>{numberToWords(selectedBillsTotal)} Naira only ({formatCurrency(selectedBillsTotal)})</strong>.</p>
                <p>We will be grateful if the money is paid to us in cash or into our account.</p>
                <p><strong>Account details: UNION BANK, RESONANCE DIAGNOSTICS LTD; 0217252732</strong></p>
                <p>Kind regards.</p>
                <div><p>Abugu, Jude Ogechukwu</p><p>For Management</p><p>08069999425</p></div>
              </article>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Print Letter</button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
