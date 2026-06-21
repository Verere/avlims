"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

type LedgerRow = {
  _id: string;
  amount?: number;
  bonus?: number;
  tests?: Array<{
    testId: string;
    testName: string;
    panelId?: string;
    panelName?: string;
    quantity?: number;
    amount?: number;
    bonus?: number;
  }>;
  status?: "pending" | "paid";
  createdAt?: string;
  businessDate?: string;
  user?: string;
  referrer?: { _id?: string; name?: string; phone?: string } | string;
  testOrder?: { _id?: string; name?: string } | string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function referrerName(referrer: LedgerRow["referrer"]) {
  if (!referrer) return "-";
  if (typeof referrer === "string") return referrer;
  return referrer.name || "-";
}

function referrerPhone(referrer: LedgerRow["referrer"]) {
  if (!referrer || typeof referrer === "string") return "";
  return String(referrer.phone || "");
}

function normalizeWhatsappPhone(phone: string) {
  let digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return "";

  if (digits.startsWith("+")) {
    return digits.slice(1);
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    // Default to NG country code for local numbers.
    return `234${digits.slice(1)}`;
  }

  return digits;
}

function patientName(order: LedgerRow["testOrder"]) {
  if (!order) return "-";
  if (typeof order === "string") return order;
  return order.name || "-";
}

function rowDate(row: LedgerRow) {
  const raw = row.businessDate || row.createdAt;
  if (!raw) return "-";
  const date = new Date(raw);
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

async function fetchReferralLedger(branchId: string, fromDate: string, toDate: string) {
  const query = new URLSearchParams({ branchId, fromDate, toDate }).toString();
  const res = await fetch(`/api/referral-ledger?${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch referral ledger" }));
    throw new Error(err.error || "Failed to fetch referral ledger");
  }
  return res.json();
}

export default function ReferrerBonusPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branchSlug = pathParts[1] || "";

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const { isDarkMode } = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!branchSlug) {
        setError("Missing branch in URL");
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const branchDoc = await fetchBranchBySlug(branchSlug);
        const data = await fetchReferralLedger(branchDoc._id, fromDate, toDate);
        if (!isMounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to fetch referral ledger");
        setRows([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [branchSlug, fromDate, toDate]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.amount += Number(row.amount || 0);
        acc.bonus += Number(row.bonus || 0);
        if (row.status === "paid") acc.paidCount += 1;
        else acc.pendingCount += 1;
        return acc;
      },
      { amount: 0, bonus: 0, paidCount: 0, pendingCount: 0 }
    );
  }, [rows]);

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, {
      referrer: string;
      entries: number;
      amount: number;
      bonus: number;
      pendingCount: number;
      paidCount: number;
      tests: Array<{
        patient: string;
        test: string;
        date: string;
        amount: number;
        bonus: number;
        status: "pending" | "paid";
      }>;
    }>();

    for (const row of rows) {
      const refName = referrerName(row.referrer);
      const patient = patientName(row.testOrder);
      const refKey = refName.toLowerCase();

      const current = grouped.get(refKey) || {
        referrer: refName,
        entries: 0,
        amount: 0,
        bonus: 0,
        pendingCount: 0,
        paidCount: 0,
        tests: [],
      };

      const rowTests = Array.isArray(row.tests) && row.tests.length > 0
        ? row.tests
        : [{
            testId: row._id,
            testName: "-",
            quantity: 1,
            amount: Number(row.amount || 0),
            bonus: Number(row.bonus || 0),
          }];

      for (const test of rowTests) {
        const testAmount = Number(test.amount || 0);
        const testBonus = Number(test.bonus || 0);
        const quantity = Number(test.quantity || 1);
        const testLabel = quantity > 1 ? `${test.testName} x${quantity}` : test.testName;

        current.entries += 1;
        current.amount += testAmount;
        current.bonus += testBonus;
        if (row.status === "paid") current.paidCount += 1;
        else current.pendingCount += 1;

        current.tests.push({
          patient,
          test: testLabel,
          date: rowDate(row),
          amount: testAmount,
          bonus: testBonus,
          status: row.status === "paid" ? "paid" : "pending",
        });
      }

      grouped.set(refKey, current);
    }

    return Array.from(grouped.values())
      .map((g) => ({
        ...g,
        tests: g.tests.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows]);

  const buildReferrerReportText = (group: any) => {
    const lines = [
      `Referrer: ${group.referrer}`,
      `Entries: ${group.entries}`,
      `Amount: ${formatCurrency(group.amount)}`,
      `Bonus: ${formatCurrency(group.bonus)}`,
      `Pending/Paid: ${group.pendingCount}/${group.paidCount}`,
      "",
      "Tests",
    ];

    for (const entry of group.tests || []) {
      lines.push(
        `- ${entry.patient} | ${entry.test} | ${entry.date} | ${formatCurrency(entry.amount)} | Bonus ${formatCurrency(entry.bonus)} | ${entry.status}`
      );
    }

    return lines.join("\n");
  };

  const handlePrintReferrer = (group: any) => {
    const popup = window.open("", "_blank", "width=900,height=700,noopener,noreferrer");
    if (!popup) return;

    const rowsHtml = (group.tests || [])
      .map(
        (entry: any) =>
          `<tr>
            <td>${entry.patient}</td>
            <td>${entry.test}</td>
            <td>${entry.date}</td>
            <td style="text-align:right;">${formatCurrency(entry.amount)}</td>
            <td style="text-align:right;">${formatCurrency(entry.bonus)}</td>
            <td style="text-align:right; text-transform: capitalize;">${entry.status}</td>
          </tr>`
      )
      .join("");

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Referrer Bonus Report</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 16px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Referrer Bonus Report</h1>
          <p><strong>Referrer:</strong> ${group.referrer}</p>
          <p><strong>Entries:</strong> ${group.entries}</p>
          <p><strong>Amount:</strong> ${formatCurrency(group.amount)}</p>
          <p><strong>Bonus:</strong> ${formatCurrency(group.bonus)}</p>
          <p><strong>Pending/Paid:</strong> ${group.pendingCount}/${group.paidCount}</p>
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Test</th>
                <th>Date</th>
                <th style="text-align:right;">Amount</th>
                <th style="text-align:right;">Bonus</th>
                <th style="text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const handleEmailReferrer = (group: any) => {
    const subject = encodeURIComponent(`Referrer Bonus Report - ${group.referrer}`);
    const body = encodeURIComponent(buildReferrerReportText(group));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const handleWhatsappReferrer = (group: any) => {
    const matched = rows.find((row) => referrerName(row.referrer).toLowerCase() === String(group.referrer).toLowerCase());
    const phone = normalizeWhatsappPhone(referrerPhone(matched?.referrer));
    if (!phone) {
      alert("No phone number found for this referrer.");
      return;
    }

    const text = encodeURIComponent(buildReferrerReportText(group));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const pageTheme = isDarkMode
    ? {
        shell: "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100",
        card: "rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm",
        mutedText: "text-slate-400",
        heading: "text-slate-100",
        input: "mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800",
        sectionHeader: "flex flex-col gap-3 bg-slate-950 px-4 py-3 md:flex-row md:items-center md:justify-between",
        tableHead: "bg-slate-900 text-xs uppercase tracking-wide text-slate-400",
        tableBody: "divide-y divide-slate-800",
        row: "hover:bg-slate-800/60",
      }
    : {
        shell: "min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100",
        card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        mutedText: "text-slate-600",
        heading: "text-slate-900",
        input: "mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
        sectionHeader: "flex flex-col gap-3 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between",
        tableHead: "bg-white text-xs uppercase tracking-wide text-slate-500",
        tableBody: "divide-y divide-slate-100",
        row: "hover:bg-slate-50",
      };

  return (
    <div className={pageTheme.shell}>
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className={`mb-6 ${pageTheme.card}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Referral Ledger</p>
              <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${pageTheme.heading}`}>Referrer Bonus</h1>
              <p className={`mt-1 text-sm ${pageTheme.mutedText}`}>Daily branch referral bonus entries.</p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={pageTheme.input}
                />
              </label>
              <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={pageTheme.input}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setFromDate(today);
                  setToDate(today);
                }}
                className={pageTheme.button}
              >
                Today
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Amount</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.amount)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Bonus</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(totals.bonus)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{totals.pendingCount}</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Paid</p>
              <p className="mt-1 text-lg font-bold text-green-900">{totals.paidCount}</p>
            </div>
          </div>
        </div>

        <div className={pageTheme.tableWrap}>
          {loading ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Loading referral ledger...</div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-red-600">{error}</div>
          ) : groupedRows.length === 0 ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No referral ledger entries for the selected date.</div>
          ) : (
            <div className="space-y-4 p-4">
              {groupedRows.map((group) => (
                <div key={group.referrer} className={`overflow-hidden rounded-xl ${isDarkMode ? "border border-slate-800" : "border border-slate-200"}`}>
                  <div className={pageTheme.sectionHeader}>
                    <div>
                      <div className={`text-sm font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Referrer</div>
                      <div className={`text-base font-bold ${pageTheme.heading}`}>{group.referrer}</div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div>
                          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Entries</div>
                          <div className={`font-semibold ${pageTheme.heading}`}>{group.entries}</div>
                        </div>
                        <div>
                          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Amount</div>
                          <div className={`font-semibold ${pageTheme.heading}`}>{formatCurrency(group.amount)}</div>
                        </div>
                        <div>
                          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Bonus</div>
                          <div className="font-semibold text-emerald-700">{formatCurrency(group.bonus)}</div>
                        </div>
                        <div>
                          <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Pending / Paid</div>
                          <div className={`font-semibold ${pageTheme.heading}`}>{group.pendingCount} / {group.paidCount}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintReferrer(group)}
                          className={pageTheme.button}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailReferrer(group)}
                          className={pageTheme.button}
                        >
                          Send Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsappReferrer(group)}
                          className={pageTheme.button}
                        >
                          Send WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className={pageTheme.tableHead}>
                        <tr>
                          <th className="px-4 py-3 text-left">Patient</th>
                          <th className="px-4 py-3 text-left">Test</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">Bonus</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className={pageTheme.tableBody}>
                        {group.tests.map((entry) => (
                          <tr key={`${group.referrer}-${entry.patient}-${entry.test}-${entry.date}-${entry.amount}-${entry.bonus}`} className={pageTheme.row}>
                            <td className={`px-4 py-3 font-medium ${pageTheme.heading}`}>{entry.patient}</td>
                            <td className={`px-4 py-3 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{entry.test}</td>
                            <td className={`px-4 py-3 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{entry.date}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${pageTheme.heading}`}>{formatCurrency(entry.amount)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(entry.bonus)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${
                              entry.status === "paid" ? "text-green-700" : "text-amber-700"
                            }`}>
                              {entry.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
