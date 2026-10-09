"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "react-toastify";

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

function escapeHtml(value: unknown) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
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

function rowTimestamp(row: LedgerRow) {
  const businessDate = row.businessDate ? new Date(row.businessDate).getTime() : Number.NaN;
  if (Number.isFinite(businessDate)) return businessDate;
  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : Number.NaN;
  return Number.isFinite(createdAt) ? createdAt : Number.NEGATIVE_INFINITY;
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
  const labSlug = pathParts[0] || "";
  const branchSlug = pathParts[1] || "";

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("pending");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [labName, setLabName] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [recalculatingPending, setRecalculatingPending] = useState<boolean>(false);
  const [showRecalculateModal, setShowRecalculateModal] = useState<boolean>(false);
  const [recalculateReferrer, setRecalculateReferrer] = useState<{ id: string; name: string } | null>(null);
  const [recalculateScope, setRecalculateScope] = useState<"all" | "test">("all");
  const [recalculationTests, setRecalculationTests] = useState<Array<{ id: string; name: string; code: string; category: string }>>([]);
  const [testsLoadedForBranch, setTestsLoadedForBranch] = useState<string>("");
  const [recalculationTestsLoading, setRecalculationTestsLoading] = useState<boolean>(false);
  const [recalculationTestSearch, setRecalculationTestSearch] = useState<string>("");
  const [recalculationTestId, setRecalculationTestId] = useState<string>("");
  const [recalculatePercentageDraft, setRecalculatePercentageDraft] = useState<string>("20");
  const [recalculateError, setRecalculateError] = useState<string>("");
  const [updatingBonusKey, setUpdatingBonusKey] = useState<string | null>(null);
  const [updatingReferrerId, setUpdatingReferrerId] = useState<string | null>(null);
  const [bonusEditor, setBonusEditor] = useState<{
    ledgerId: string;
    testIndex: number;
    referrer: string;
    patient: string;
    test: string;
    date: string;
    amount: number;
    bonus: number;
    status: "pending" | "paid";
  } | null>(null);
  const [bonusDraft, setBonusDraft] = useState<string>("0");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "html">("csv");
  const { isDarkMode } = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!branchSlug) {
        setError("Missing branch in URL");
        setRows([]);
        setLabName("");
        setBranchId("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [branchDoc, lab] = await Promise.all([
          fetchBranchBySlug(branchSlug),
          labSlug
            ? fetch(`/api/labs/${labSlug}`).then((res) => (res.ok ? res.json() : null)).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!isMounted) return;
        setLabName(String(lab?.name || ""));
        setBranchId(String(branchDoc._id || ""));
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
  }, [labSlug, branchSlug, fromDate, toDate]);

  useEffect(() => {
    if (
      !showRecalculateModal ||
      recalculateScope !== "test" ||
      !branchId ||
      testsLoadedForBranch === branchId
    ) return;

    let isMounted = true;
    setRecalculationTestsLoading(true);
    setRecalculateError("");

    async function loadTests() {
      try {
        const res = await fetch(`/api/tests?branchId=${encodeURIComponent(branchId)}`);
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Failed to load tests" }));
          throw new Error(error.error || "Failed to load tests");
        }

        const data = await res.json() as Array<{ id?: string; _id?: string; name?: string; code?: string; category?: string }>;
        if (!isMounted) return;
        setRecalculationTests(Array.isArray(data)
          ? data
              .map((test) => ({
                id: String(test.id || test._id || ""),
                name: String(test.name || ""),
                code: String(test.code || ""),
                category: String(test.category || ""),
              }))
              .filter((test) => test.id && test.name)
          : []);
        setTestsLoadedForBranch(branchId);
      } catch (err: unknown) {
        if (isMounted) {
          setRecalculateError(err instanceof Error ? err.message : "Failed to load tests");
        }
      } finally {
        if (isMounted) setRecalculationTestsLoading(false);
      }
    }

    void loadTests();
    return () => {
      isMounted = false;
    };
  }, [showRecalculateModal, recalculateScope, branchId, testsLoadedForBranch]);

  const openRecalculateModal = (referrer: { id: string; name: string } | null = null) => {
    setRecalculateError("");
    setRecalculateReferrer(referrer);
    setRecalculateScope("all");
    setRecalculationTestSearch("");
    setRecalculationTestId("");
    setShowRecalculateModal(true);
  };

  const filteredRecalculationTests = useMemo(() => {
    const query = recalculationTestSearch.trim().toLowerCase();
    return recalculationTests.filter((test) =>
      [test.name, test.code, test.category].some((value) => value.toLowerCase().includes(query))
    );
  }, [recalculationTests, recalculationTestSearch]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;

      const referrer = referrerName(row.referrer).toLowerCase();
      const patient = patientName(row.testOrder).toLowerCase();
      const tests = (Array.isArray(row.tests) ? row.tests : []).map((test) => test.testName.toLowerCase());
      return [referrer, patient, ...tests].some((value) => value.includes(query));
    }).sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
  }, [rows, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.amount += Number(row.amount || 0);
        acc.bonus += Number(row.bonus || 0);
        if (row.status === "paid") acc.paidCount += 1;
        else acc.pendingCount += 1;
        return acc;
      },
      { amount: 0, bonus: 0, paidCount: 0, pendingCount: 0 }
    );
  }, [filteredRows]);

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, {
      referrer: string;
      referrerId: string;
      latestDate: number;
      entries: number;
      amount: number;
      bonus: number;
      pendingCount: number;
      paidCount: number;
      tests: Array<{
        ledgerId: string;
        testIndex: number;
        referrer: string;
        patient: string;
        test: string;
        date: string;
        amount: number;
        bonus: number;
        status: "pending" | "paid";
      }>;
    }>();

    for (const row of filteredRows) {
      const refName = referrerName(row.referrer);
      const referrerId = typeof row.referrer === "string" ? row.referrer : String(row.referrer?._id || "");
      const patient = patientName(row.testOrder);
      const refKey = referrerId || refName.toLowerCase();

      const current = grouped.get(refKey) || {
        referrer: refName,
        referrerId,
        latestDate: Number.NEGATIVE_INFINITY,
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

      current.latestDate = Math.max(current.latestDate, rowTimestamp(row));
      rowTests.forEach((test, index) => {
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
          ledgerId: row._id,
          testIndex: index,
          referrer: refName,
          patient,
          test: testLabel,
          date: rowDate(row),
          amount: testAmount,
          bonus: testBonus,
          status: row.status === "paid" ? "paid" : "pending",
        });
      });

      grouped.set(refKey, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.latestDate - a.latestDate);
  }, [filteredRows]);

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

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "referrer";

  const buildExportRows = (group: any) =>
    (group.tests || []).map((entry: any) => ({
      patient: entry.patient,
      test: entry.test,
      date: entry.date,
      amount: Number(entry.amount || 0),
      bonus: Number(entry.bonus || 0),
      status: entry.status,
    }));

  const buildCsvContent = (rowsForExport: Array<{ patient: string; test: string; date: string; amount: number; bonus: number; status: string }>) => {
    const headers = ["Patient", "Test", "Date", "Amount", "Bonus", "Status"];
    const escapeCell = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = rowsForExport.map((row) => {
      return [
        row.patient,
        row.test,
        row.date,
        row.amount,
        row.bonus,
        row.status,
      ].map(escapeCell).join(",");
    });

    return [headers.map(escapeCell).join(","), ...lines].join("\n");
  };

  const downloadExportFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExportReferrer = (group: any, format: "csv" | "excel" | "html" = exportFormat) => {
    const rowsForExport = buildExportRows(group);

    if (rowsForExport.length === 0) {
      toast.warning("No rows available to export.");
      return;
    }

    const totalAmount = rowsForExport.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const totalBonus = rowsForExport.reduce((sum: number, row: any) => sum + Number(row.bonus || 0), 0);
    const exportDate = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (format === "csv" || format === "excel") {
      const csvContent = buildCsvContent(rowsForExport);
      const mimeType = format === "excel" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8";
      const extension = format === "excel" ? ".xls" : ".csv";
      const fileName = `${slugify(group.referrer || "referrer")}-bonus${extension}`;
      downloadExportFile(`\uFEFF${csvContent}`, fileName, mimeType);
      return;
    }

    const tableRows = rowsForExport
      .map(
        (row: any) => `
          <tr>
            <td>${row.patient || "-"}</td>
            <td>${row.test || "-"}</td>
            <td>${row.date || "-"}</td>
            <td style="text-align:right; white-space:nowrap;">${formatCurrency(row.amount)}</td>
            <td style="text-align:right; white-space:nowrap;">${formatCurrency(row.bonus)}</td>
            <td style="text-align:left; text-transform:capitalize;">${row.status || "pending"}</td>
          </tr>
        `
      )
      .join("");

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Referrer Bonus Export</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 32px;
              color: #0f172a;
              background: #ffffff;
            }
            .report {
              max-width: 980px;
              margin: 0 auto;
            }
            .header {
              margin-bottom: 18px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              margin: 0 0 6px;
            }
            .lab-name {
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 8px;
            }
            .meta {
              font-size: 12px;
              color: #475569;
              margin: 4px 0;
            }
            .referrer {
              font-size: 18px;
              font-weight: 700;
              margin: 18px 0 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              font-size: 13px;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              text-align: left;
              font-weight: 700;
            }
            tr:nth-child(even) td {
              background: #f8fafc;
            }
            .totals {
              margin-top: 18px;
              padding: 14px 16px;
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              width: 100%;
              max-width: 360px;
              margin-left: auto;
              border-radius: 8px;
            }
            .totals h3 {
              margin: 0 0 10px;
              font-size: 16px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              font-size: 14px;
              margin: 8px 0;
            }
            .label {
              font-weight: 600;
              color: #334155;
            }
            .value {
              font-weight: 700;
              color: #0f172a;
            }
            @page {
              margin: 16mm;
            }
            @media print {
              body { padding: 0; }
              thead { display: table-header-group; }
              tr, .totals { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <div class="lab-name">${escapeHtml(labName || labSlug || "Laboratory")}</div>
              <div class="title">Referrer Bonus Export</div>
              <div class="meta">Exported: ${exportDate}</div>
              <div class="meta">Referrer: ${group.referrer || "-"}</div>
            </div>

            <div class="referrer">Referrer: ${group.referrer || "-"}</div>

            <table>
              <thead>
                <tr>
                  <th style="width:18%;">Patient</th>
                  <th style="width:24%;">Test</th>
                  <th style="width:14%;">Date</th>
                  <th style="width:14%; text-align:right;">Amount</th>
                  <th style="width:14%; text-align:right;">Bonus</th>
                  <th style="width:16%;">Status</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>

            <div class="totals">
              <h3>Summary</h3>
              <div class="totals-row"><span class="label">Total Amount:</span> <span class="value">${formatCurrency(totalAmount)}</span></div>
              <div class="totals-row"><span class="label">Total Bonus:</span> <span class="value">${formatCurrency(totalBonus)}</span></div>
            </div>
          </div>
        </body>
      </html>`;

    const popup = window.open("", "_blank", "width=1000,height=780");
    if (!popup) {
      toast.warning("Your browser blocked the export preview window. Please allow popups and try again.");
      return;
    }

    try {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      window.setTimeout(() => popup.print(), 500);
    } catch (error) {
      console.error("Failed to render export preview", error);
      popup.close();
      toast.error("Could not open the PDF export. Please try again or use the Print button.");
    }
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
      toast.warning("No phone number found for this referrer.");
      return;
    }

    const text = encodeURIComponent(buildReferrerReportText(group));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleEditBonus = (entry: { ledgerId: string; testIndex: number; referrer: string; patient: string; test: string; date: string; amount: number; bonus: number; status: "pending" | "paid" }) => {
    setBonusEditor({
      ledgerId: entry.ledgerId,
      testIndex: entry.testIndex,
      referrer: entry.referrer,
      patient: entry.patient,
      test: entry.test,
      date: entry.date,
      amount: entry.amount,
      bonus: entry.bonus,
      status: entry.status,
    });
    setBonusDraft(String(entry.bonus || 0));
  };

  const saveBonusEdit = async () => {
    if (!bonusEditor) return;

    const parsedValue = Number(bonusDraft);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      toast.warning("Bonus must be a valid non-negative number.");
      return;
    }

    const key = `${bonusEditor.ledgerId}-${bonusEditor.testIndex}`;
    setUpdatingBonusKey(key);

    try {
      const res = await fetch("/api/referral-ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bonusEditor.ledgerId, testIndex: bonusEditor.testIndex, bonus: parsedValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update bonus");
      }

      setRows((currentRows) =>
        currentRows.map((row) => {
          if (row._id !== bonusEditor.ledgerId) return row;
          const nextTests = (Array.isArray(row.tests) ? row.tests : []).map((test, idx) =>
            idx === bonusEditor.testIndex ? { ...test, bonus: parsedValue } : test
          );
          const nextBonus = nextTests.reduce((sum, test) => sum + Number(test.bonus || 0), 0);
          return { ...row, tests: nextTests, bonus: nextBonus };
        })
      );
      setBonusEditor(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update bonus.");
    } finally {
      setUpdatingBonusKey((current) => (current === key ? null : current));
    }
  };

  const recalculatePendingBonuses = async () => {
    if (!branchId || recalculatingPending) return;
    const percentage = Number(recalculatePercentageDraft);
    if (!recalculatePercentageDraft.trim() || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      setRecalculateError("Enter a percentage between 0 and 100.");
      return;
    }
    const selectedTest = recalculationTests.find((test) => test.id === recalculationTestId);
    if (recalculateScope === "test" && !selectedTest) {
      setRecalculateError("Select a test to recalculate.");
      return;
    }

    setRecalculateError("");
    setRecalculatingPending(true);
    try {
      const res = await fetch("/api/referral-ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recalculatePending",
          branchId,
          percentage,
          referrerId: recalculateReferrer?.id,
          testId: recalculateScope === "test" ? selectedTest?.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to recalculate pending bonuses");

      const refreshedRows = await fetchReferralLedger(branchId, fromDate, toDate);
      setRows(Array.isArray(refreshedRows) ? refreshedRows : []);
      setShowRecalculateModal(false);
      setRecalculateReferrer(null);
      const target = recalculateReferrer ? ` for ${recalculateReferrer.name}` : "";
      const testTarget = selectedTest ? ` for ${selectedTest.name}` : "";
      toast.success(`Updated ${data.updatedCount} pending entries${target}${testTarget} to ${percentage}%.`);
    } catch (err: any) {
      setRecalculateError(err?.message || "Failed to recalculate pending bonuses.");
    } finally {
      setRecalculatingPending(false);
    }
  };

  const updateReferrerPendingStatus = async (group: { referrerId: string; referrer: string }) => {
    if (!branchId || !group.referrerId || updatingReferrerId) return;

    const ledgerIds = rows
      .filter((row) => {
        const rowReferrerId = typeof row.referrer === "string" ? row.referrer : String(row.referrer?._id || "");
        return rowReferrerId === group.referrerId && row.status === "pending";
      })
      .map((row) => row._id);

    if (ledgerIds.length === 0) {
      toast.info(`No fetched pending entries for ${group.referrer}.`);
      return;
    }

    setUpdatingReferrerId(group.referrerId);
    try {
      const res = await fetch("/api/referral-ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markReferrerPendingPaid",
          branchId,
          referrerId: group.referrerId,
          ledgerIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update referral status");

      const updatedIds = new Set<string>(data.updatedLedgerIds || []);
      setRows((currentRows) => currentRows.map((row) =>
        updatedIds.has(row._id) ? { ...row, status: "paid" } : row
      ));
      toast.success(`${data.updatedCount} pending entr${data.updatedCount === 1 ? "y" : "ies"} for ${group.referrer} marked paid.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update referral status.");
    } finally {
      setUpdatingReferrerId((current) => current === group.referrerId ? null : current);
    }
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
        {showRecalculateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className={`w-full max-w-md rounded-xl border ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"} p-5 shadow-2xl`}>
              <h2 className={`text-lg font-bold ${pageTheme.heading}`}>
                {recalculateReferrer ? `Recalculate pending bonuses for ${recalculateReferrer.name}` : "Recalculate pending bonuses"}
              </h2>
              <p className={`mt-2 text-sm ${pageTheme.mutedText}`}>
                This percentage applies to pending, non-cancelled entries {recalculateReferrer ? `for ${recalculateReferrer.name}` : "in this branch"} across all dates. Paid and cancelled entries will not change.
              </p>
              <label className={`mt-4 flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Recalculate
                <select
                  value={recalculateScope}
                  onChange={(event) => {
                    setRecalculateScope(event.target.value as "all" | "test");
                    setRecalculationTestId("");
                    setRecalculationTestSearch("");
                    setRecalculateError("");
                  }}
                  className={pageTheme.input}
                >
                  <option value="all">All tests</option>
                  <option value="test">Specific test</option>
                </select>
              </label>
              {recalculateScope === "test" && (
                <div className="mt-3 space-y-3">
                  <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Search tests
                    <input
                      type="search"
                      value={recalculationTestSearch}
                      onChange={(event) => setRecalculationTestSearch(event.target.value)}
                      placeholder="Search by name, code, or category"
                      className={pageTheme.input}
                    />
                  </label>
                  {!recalculationTestsLoading && testsLoadedForBranch === branchId && (
                    <p className={`text-xs ${pageTheme.mutedText}`}>
                      Showing {filteredRecalculationTests.length} of {recalculationTests.length} tests
                    </p>
                  )}
                  <div
                    role="radiogroup"
                    aria-label="Select a test to recalculate"
                    className={`max-h-48 overflow-y-auto rounded-lg border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}
                  >
                    {recalculationTestsLoading ? (
                      <p className={`px-3 py-3 text-sm ${pageTheme.mutedText}`}>Loading tests...</p>
                    ) : filteredRecalculationTests.map((test) => (
                        <label
                          key={test.id}
                          className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                            recalculationTestId === test.id
                              ? isDarkMode ? "bg-slate-800 text-slate-100" : "bg-blue-50 text-slate-900"
                              : isDarkMode ? "text-slate-300 hover:bg-slate-800/60" : "text-slate-700 hover:bg-slate-50"
                          } ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}
                        >
                          <input
                            type="radio"
                            name="recalculation-test"
                            value={test.id}
                            checked={recalculationTestId === test.id}
                            onChange={() => {
                              setRecalculationTestId(test.id);
                              setRecalculateError("");
                            }}
                          />
                          <span>{test.name}</span>
                        </label>
                      ))}
                    {!recalculationTestsLoading && filteredRecalculationTests.length === 0 && (
                      <p className={`px-3 py-3 text-sm ${pageTheme.mutedText}`}>
                        {recalculationTests.length === 0 ? "No tests found for this branch." : "No tests match your search."}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <label className={`mt-4 flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Bonus percentage
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={recalculatePercentageDraft}
                    onChange={(event) => {
                      setRecalculatePercentageDraft(event.target.value);
                      setRecalculateError("");
                    }}
                    className={`${pageTheme.input} w-full pr-9`}
                    autoFocus
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${pageTheme.mutedText}`}>%</span>
                </div>
              </label>
              {recalculateError && <p className="mt-2 text-sm text-red-600">{recalculateError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecalculateModal(false);
                    setRecalculateReferrer(null);
                    setRecalculationTestsLoading(false);
                    setRecalculateError("");
                  }}
                  disabled={recalculatingPending}
                  className={pageTheme.button}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={recalculatePendingBonuses}
                  disabled={recalculatingPending}
                  className={`${pageTheme.button} ${recalculatingPending ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {recalculatingPending ? "Applying..." : "Apply percentage"}
                </button>
              </div>
            </div>
          </div>
        )}

        {bonusEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className={`w-full max-w-lg rounded-2xl border ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"} p-5 shadow-2xl`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Update Referral Ledger</p>
                  <h2 className={`mt-1 text-xl font-bold ${pageTheme.heading}`}>Edit bonus</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setBonusEditor(null)}
                  className={pageTheme.button}
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Referrer</div>
                    <div className={`mt-1 rounded-lg border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                      {bonusEditor.referrer}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Status</div>
                    <div className={`mt-1 rounded-lg border px-3 py-2 capitalize ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                      {bonusEditor.status}
                    </div>
                  </div>
                </div>

                <div>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Patient</div>
                  <div className={`mt-1 rounded-lg border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    {bonusEditor.patient}
                  </div>
                </div>

                <div>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Test</div>
                  <div className={`mt-1 rounded-lg border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    {bonusEditor.test}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Date</div>
                    <div className={`mt-1 rounded-lg border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                      {bonusEditor.date}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Amount</div>
                    <div className={`mt-1 rounded-lg border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                      {formatCurrency(bonusEditor.amount)}
                    </div>
                  </div>
                </div>

                <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Bonus Amount
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bonusDraft}
                    onChange={(e) => setBonusDraft(e.target.value)}
                    className={pageTheme.input}
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setBonusEditor(null)} className={pageTheme.button}>
                  Cancel
                </button>
                <button type="button" onClick={saveBonusEdit} className={pageTheme.button}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`mb-6 ${pageTheme.card}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Referral Ledger</p>
              <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${pageTheme.heading}`}>Referrer Bonus</h1>
              <p className={`mt-1 text-sm ${pageTheme.mutedText}`}>Daily branch referral bonus entries.</p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Search
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Referrer, patient or test"
                  className={pageTheme.input}
                />
              </label>
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
              <label className={`flex flex-col text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | "pending" | "paid")}
                  className={pageTheme.input}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  openRecalculateModal();
                }}
                disabled={!branchId || recalculatingPending}
                className={`${pageTheme.button} ${recalculatingPending ? "cursor-not-allowed opacity-60" : ""}`}
              >
                Recalculate all pending
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
                <div key={group.referrerId || group.referrer} className={`overflow-hidden rounded-xl ${isDarkMode ? "border border-slate-800" : "border border-slate-200"}`}>
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
                          onClick={() => openRecalculateModal({ id: group.referrerId, name: group.referrer })}
                          disabled={!group.referrerId || recalculatingPending}
                          className={`${pageTheme.button} ${!group.referrerId || recalculatingPending ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          Recalculate pending
                        </button>
                        <label className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          <span>Format</span>
                          <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value as "csv" | "excel" | "html")}
                            className={pageTheme.input}
                          >
                            <option value="csv">CSV</option>
                            <option value="excel">Excel</option>
                            <option value="html">HTML/PDF</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleExportReferrer(group, exportFormat)}
                          className={pageTheme.button}
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={() => updateReferrerPendingStatus(group)}
                          disabled={!group.referrerId || group.pendingCount === 0 || updatingReferrerId === group.referrerId}
                          className={`${pageTheme.button} ${!group.referrerId || group.pendingCount === 0 || updatingReferrerId === group.referrerId ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {updatingReferrerId === group.referrerId ? "Updating status..." : "Mark pending as paid"}
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
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className={pageTheme.tableBody}>
                        {group.tests.map((entry) => (
                          <tr key={`${group.referrer}-${entry.patient}-${entry.test}-${entry.date}-${entry.amount}-${entry.bonus}-${entry.ledgerId}-${entry.testIndex}`} className={pageTheme.row}>
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
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleEditBonus(entry)}
                                disabled={updatingBonusKey === `${entry.ledgerId}-${entry.testIndex}`}
                                className={
                                  `${pageTheme.button} ${
                                    updatingBonusKey === `${entry.ledgerId}-${entry.testIndex}`
                                      ? "cursor-not-allowed opacity-60"
                                      : ""
                                  }`
                                }
                              >
                                {updatingBonusKey === `${entry.ledgerId}-${entry.testIndex}` ? "Saving..." : "Edit Bonus"}
                              </button>
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
