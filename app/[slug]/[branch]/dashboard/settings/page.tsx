"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import type { ReferralBonusPolicy } from "@/lib/referralBonus";
import {
  DEFAULT_TRANSACTION_ID_CONFIG,
  type TransactionIdConfig,
  type TransactionIdReset,
} from "@/lib/transactionId";

const emptyPolicy = (): ReferralBonusPolicy => ({
  defaultPercentage: 0,
  exceptions: [{ testName: "", percentage: 0 }],
});

export default function SettingsPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const labSlug = pathParts[0] || "";
  const branchSlug = pathParts[1] || "";

  const [policy, setPolicy] = useState<ReferralBonusPolicy>(emptyPolicy());
  const [labTransactionConfig, setLabTransactionConfig] = useState<TransactionIdConfig>(DEFAULT_TRANSACTION_ID_CONFIG);
  const [branchTransactionConfig, setBranchTransactionConfig] = useState<TransactionIdConfig>(DEFAULT_TRANSACTION_ID_CONFIG);
  const [branchOverrideEnabled, setBranchOverrideEnabled] = useState(false);
  const [savingTransactionScope, setSavingTransactionScope] = useState<"lab" | "branch" | null>(null);
  const [availableTests, setAvailableTests] = useState<Array<{ id: string; name: string; price: number; category?: string }>>([]);
  const [availablePanels, setAvailablePanels] = useState<Array<{ _id?: string; id?: string; name: string; code?: string; price?: number; category?: string }>>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [panelsLoading, setPanelsLoading] = useState(false);
  const [testSearchTerms, setTestSearchTerms] = useState<Record<number, string>>({});
  const [panelSearchTerms, setPanelSearchTerms] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!branchSlug) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/branches/${branchSlug}`);
        if (!res.ok) throw new Error("Failed to load branch settings");
        const branch = await res.json();
        const transactionSettingsRes = await fetch(
          `/api/transaction-id-settings?labSlug=${encodeURIComponent(labSlug)}&branchSlug=${encodeURIComponent(branchSlug)}`
        );
        if (!transactionSettingsRes.ok) {
          const data = await transactionSettingsRes.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load transaction ID settings");
        }
        const transactionSettings = await transactionSettingsRes.json();
        setLabTransactionConfig(transactionSettings.labConfig || DEFAULT_TRANSACTION_ID_CONFIG);
        setBranchTransactionConfig(transactionSettings.branchConfig || transactionSettings.labConfig || DEFAULT_TRANSACTION_ID_CONFIG);
        setBranchOverrideEnabled(transactionSettings.usesBranchOverride === true);
        setPolicy({
          defaultPercentage: Number(branch?.referralBonusPolicy?.defaultPercentage ?? 0),
          exceptions: Array.isArray(branch?.referralBonusPolicy?.exceptions) && branch.referralBonusPolicy.exceptions.length
            ? branch.referralBonusPolicy.exceptions.map((entry: any) => ({
                type: entry?.type === "panel" ? "panel" : "test",
                testId: entry?.testId || "",
                testName: entry?.testName || "",
                panelId: entry?.panelId || "",
                panelName: entry?.panelName || "",
                percentage: Number(entry?.percentage ?? 0),
              }))
            : [{ type: "test", testName: "", testId: "", panelName: "", panelId: "", percentage: 0 }],
        });

        if (branch?._id) {
          setTestsLoading(true);
          setPanelsLoading(true);
          const [testsRes, panelsRes] = await Promise.all([
            fetch(`/api/tests?branchId=${branch._id}`),
            fetch(`/api/panels?branchId=${branch._id}&isActive=true`),
          ]);

          if (testsRes.ok) {
            const tests = await testsRes.json();
            setAvailableTests(Array.isArray(tests) ? tests : []);
          } else {
            setAvailableTests([]);
          }

          if (panelsRes.ok) {
            const panels = await panelsRes.json();
            setAvailablePanels(Array.isArray(panels) ? panels.map((panel: any) => ({
              _id: panel?._id || panel?.id,
              id: panel?._id || panel?.id,
              name: panel?.name || "",
              code: panel?.code || "",
              price: Number(panel?.price || 0),
              category: panel?.category || "",
            })) : []);
          } else {
            setAvailablePanels([]);
          }

          setTestsLoading(false);
          setPanelsLoading(false);
        } else {
          setAvailableTests([]);
          setAvailablePanels([]);
        }
      } catch (error: any) {
        setMessage(error?.message || "Unable to load settings");
      } finally {
        setLoading(false);
        setTestsLoading(false);
      }
    }

    load();
  }, [labSlug, branchSlug]);

  const totalExceptions = useMemo(
    () => policy.exceptions.filter((entry) => entry.testName || entry.testId || entry.panelName || entry.panelId).length,
    [policy.exceptions]
  );

  const updateDefaultPercentage = (value: string) => {
    const numeric = Number(value || 0);
    setPolicy((prev) => ({ ...prev, defaultPercentage: Number.isFinite(numeric) ? numeric : 0 }));
  };

  const updateException = (index: number, field: "testName" | "testId" | "panelName" | "panelId" | "percentage", value: string) => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: prev.exceptions.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;
        if (field === "percentage") {
          const numeric = Number(value || 0);
          return { ...entry, percentage: Number.isFinite(numeric) ? numeric : 0 };
        }
        return { ...entry, [field]: value };
      }),
    }));
  };

  const setExceptionType = (index: number, type: "test" | "panel") => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: prev.exceptions.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              type,
              testId: type === "test" ? entry.testId || "" : "",
              testName: type === "test" ? entry.testName || "" : "",
              panelId: type === "panel" ? entry.panelId || "" : "",
              panelName: type === "panel" ? entry.panelName || "" : "",
            }
          : entry
      ),
    }));
    setTestSearchTerms((prev) => ({ ...prev, [index]: "" }));
    setPanelSearchTerms((prev) => ({ ...prev, [index]: "" }));
  };

  const selectTestForException = (index: number, test: { id: string; name: string }) => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: prev.exceptions.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, type: "test", testId: test.id, testName: test.name }
          : entry
      ),
    }));
    setTestSearchTerms((prev) => ({ ...prev, [index]: "" }));
  };

  const selectPanelForException = (index: number, panel: { id?: string; _id?: string; name: string }) => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: prev.exceptions.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, type: "panel", panelId: panel.id || panel._id || "", panelName: panel.name }
          : entry
      ),
    }));
    setPanelSearchTerms((prev) => ({ ...prev, [index]: "" }));
  };

  const addException = () => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: [...prev.exceptions, { testName: "", testId: "", percentage: 0 }],
    }));
  };

  const removeException = (index: number) => {
    setPolicy((prev) => ({
      ...prev,
      exceptions: prev.exceptions.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!branchSlug) {
      setMessage("Branch slug is missing.");
      return;
    }

    const cleanedExceptions = policy.exceptions
      .filter((entry) => entry.testName || entry.testId || entry.panelName || entry.panelId)
      .map((entry) => ({
        type: entry.type === "panel" ? "panel" : "test",
        testId: entry.testId || undefined,
        testName: entry.testName?.trim() || undefined,
        panelId: entry.panelId || undefined,
        panelName: entry.panelName?.trim() || undefined,
        percentage: Number(entry.percentage || 0),
      }));

    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/branches/${branchSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralBonusPolicy: {
            defaultPercentage: Number(policy.defaultPercentage || 0),
            exceptions: cleanedExceptions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save settings");

      const refreshed = await fetch(`/api/branches/${branchSlug}`);
      const branch = refreshed.ok ? await refreshed.json() : null;
      if (branch?.referralBonusPolicy) {
        setPolicy({
          defaultPercentage: Number(branch.referralBonusPolicy.defaultPercentage ?? 0),
          exceptions: Array.isArray(branch.referralBonusPolicy.exceptions) && branch.referralBonusPolicy.exceptions.length
            ? branch.referralBonusPolicy.exceptions.map((entry: any) => ({
                type: entry?.type === "panel" ? "panel" : "test",
                testId: entry?.testId || "",
                testName: entry?.testName || "",
                panelId: entry?.panelId || "",
                panelName: entry?.panelName || "",
                percentage: Number(entry?.percentage ?? 0),
              }))
            : [{ type: "test", testId: "", testName: "", panelId: "", panelName: "", percentage: 0 }],
        });
      }

      setMessage("Referral bonus settings saved successfully.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveTransactionConfig = async (scope: "lab" | "branch") => {
    if (!labSlug || !branchSlug) {
      setMessage("Lab or branch slug is missing.");
      return;
    }
    setSavingTransactionScope(scope);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/transaction-id-settings?labSlug=${encodeURIComponent(labSlug)}&branchSlug=${encodeURIComponent(branchSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            config: scope === "lab" ? labTransactionConfig : branchTransactionConfig,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save transaction ID settings");
      if (scope === "lab" && !branchOverrideEnabled) {
        setBranchTransactionConfig(labTransactionConfig);
      }
      setMessage(`${scope === "lab" ? "Lab-wide" : "Branch override"} transaction ID settings saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save transaction ID settings");
    } finally {
      setSavingTransactionScope(null);
    }
  };

  const clearBranchTransactionOverride = async () => {
    setSavingTransactionScope("branch");
    setMessage(null);
    try {
      const res = await fetch(
        `/api/transaction-id-settings?labSlug=${encodeURIComponent(labSlug)}&branchSlug=${encodeURIComponent(branchSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "clearBranch" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove branch override");
      setBranchOverrideEnabled(false);
      setBranchTransactionConfig(labTransactionConfig);
      setMessage("Branch override removed; this branch now uses the lab-wide pattern.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove branch override");
    } finally {
      setSavingTransactionScope(null);
    }
  };

  const applyTransactionPreset = (
    setter: Dispatch<SetStateAction<TransactionIdConfig>>,
    reset: TransactionIdReset
  ) => {
    const datePart = reset === "yearly"
      ? "-{YYYY}"
      : reset === "monthly"
        ? "-{YYYY}{MM}"
        : reset === "daily"
          ? "-{YYYY}{MM}{DD}"
          : "";
    setter((current) => ({
      ...current,
      reset,
      pattern: `{LAB}-{BRANCH}${datePart}-{SEQ}`,
    }));
  };

  const transactionPatternEditor = (
    label: string,
    config: TransactionIdConfig,
    setter: Dispatch<SetStateAction<TransactionIdConfig>>
  ) => (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Preset
        <select
          value={config.reset}
          onChange={(event) => applyTransactionPreset(setter, event.target.value as TransactionIdReset)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="never">Continuous sequence</option>
          <option value="yearly">Reset yearly</option>
          <option value="monthly">Reset monthly</option>
          <option value="daily">Reset daily</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Sequence digits
        <input
          type="number"
          min={1}
          max={10}
          value={config.sequenceDigits}
          onChange={(event) => setter((current) => ({
            ...current,
            sequenceDigits: Number(event.target.value),
          }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
        ID pattern
        <input
          type="text"
          value={config.pattern}
          onChange={(event) => setter((current) => ({ ...current, pattern: event.target.value }))}
          maxLength={100}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono"
          aria-label={`${label} transaction ID pattern`}
        />
        <span className="text-xs font-normal text-slate-500">
          Tokens: {"{LAB}"} lab initials, {"{BRANCH}"} branch initials, {"{YYYY}"}/{"{MM}"}/{"{DD}"} date parts, {"{SEQ}"} sequence. Reset periods require matching date tokens.
        </span>
      </label>
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 md:col-span-2">
        Preview: <span className="font-mono font-semibold text-slate-900">
          {config.pattern
            .replace("{LAB}", "LAB")
            .replace("{BRANCH}", "BR")
            .replace("{YYYY}", "2026")
            .replace("{MM}", "10")
            .replace("{DD}", "11")
            .replace("{SEQ}", "0001")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">System</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Referral Bonus Settings</h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading settings...</div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Test order transaction IDs</h2>
              <p className="mb-4 mt-1 text-sm text-slate-600">
                Choose the lab-wide ID pattern. Existing transaction IDs will not change.
              </p>
              {transactionPatternEditor("Lab-wide", labTransactionConfig, setLabTransactionConfig)}
              <button
                type="button"
                onClick={() => saveTransactionConfig("lab")}
                disabled={savingTransactionScope !== null}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingTransactionScope === "lab" ? "Saving..." : "Save lab-wide pattern"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Branch override</h2>
                  <p className="text-sm text-slate-500">Optionally use a different transaction ID format for this branch.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={branchOverrideEnabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setBranchOverrideEnabled(enabled);
                      if (!enabled) setBranchTransactionConfig(labTransactionConfig);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Enable branch override
                </label>
              </div>
              {branchOverrideEnabled ? (
                <>
                  {transactionPatternEditor("Branch", branchTransactionConfig, setBranchTransactionConfig)}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveTransactionConfig("branch")}
                      disabled={savingTransactionScope !== null}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingTransactionScope === "branch" ? "Saving..." : "Save branch override"}
                    </button>
                    <button
                      type="button"
                      onClick={clearBranchTransactionOverride}
                      disabled={savingTransactionScope !== null}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Remove override
                    </button>
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  This branch uses the lab-wide pattern.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Default referral bonus percentage
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={policy.defaultPercentage}
                    onChange={(e) => updateDefaultPercentage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-semibold text-slate-600">%</span>
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Test and panel exceptions</h2>
                  <p className="text-sm text-slate-500">Override the default percentage for individual tests or package panels.</p>
                </div>
                <button
                  type="button"
                  onClick={addException}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  + Add exception
                </button>
              </div>

              {policy.exceptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No exceptions yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {policy.exceptions.map((entry, index) => {
                    const filteredTests = availableTests.filter((test) => {
                      const search = (testSearchTerms[index] || "").toLowerCase();
                      if (!search) return true;
                      return test.name.toLowerCase().includes(search) || (test.category || "").toLowerCase().includes(search);
                    });

                    const filteredPanels = availablePanels.filter((panel) => {
                      const search = (panelSearchTerms[index] || "").toLowerCase();
                      if (!search) return true;
                      return (panel.name || "").toLowerCase().includes(search) || (panel.code || "").toLowerCase().includes(search) || (panel.category || "").toLowerCase().includes(search);
                    });

                    return (
                      <div key={`${entry.testName || entry.panelName || "new"}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-700">Exception #{index + 1}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExceptionType(index, "test")}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                entry.type === "test" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"
                              }`}
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() => setExceptionType(index, "panel")}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                entry.type === "panel" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-300 bg-white text-slate-600"
                              }`}
                            >
                              Panel
                            </button>
                            <button
                              type="button"
                              onClick={() => removeException(index)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-sm font-semibold text-slate-700">Test exception</div>
                            <input
                              type="text"
                              value={testSearchTerms[index] ?? entry.testName ?? ""}
                              onChange={(e) => {
                                setTestSearchTerms((prev) => ({ ...prev, [index]: e.target.value }));
                                if (!e.target.value.trim()) {
                                  updateException(index, "testName", "");
                                  updateException(index, "testId", "");
                                }
                              }}
                              placeholder="Search test"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                            />

                            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                              {testsLoading ? (
                                <div className="p-2 text-xs text-slate-500">Loading tests...</div>
                              ) : filteredTests.length > 0 ? (
                                filteredTests.slice(0, 6).map((test) => (
                                  <button
                                    key={`test-${test.id}`}
                                    type="button"
                                    onClick={() => selectTestForException(index, test)}
                                    className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-100"
                                  >
                                    <span>{test.name}</span>
                                    <span className="text-xs text-slate-500">Test</span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-slate-500">No test matches.</div>
                              )}
                            </div>

                            {entry.testName && (
                              <div className="mt-2 text-xs text-slate-600">
                                Selected: <span className="font-semibold">{entry.testName}</span>
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-sm font-semibold text-slate-700">Panel exception</div>
                            <input
                              type="text"
                              value={panelSearchTerms[index] ?? entry.panelName ?? ""}
                              onChange={(e) => {
                                setPanelSearchTerms((prev) => ({ ...prev, [index]: e.target.value }));
                                if (!e.target.value.trim()) {
                                  updateException(index, "panelName", "");
                                  updateException(index, "panelId", "");
                                }
                              }}
                              placeholder="Search panel"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                            />

                            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                              {panelsLoading ? (
                                <div className="p-2 text-xs text-slate-500">Loading panels...</div>
                              ) : filteredPanels.length > 0 ? (
                                filteredPanels.slice(0, 6).map((panel) => (
                                  <button
                                    key={`panel-${panel.id || panel._id}`}
                                    type="button"
                                    onClick={() => selectPanelForException(index, panel)}
                                    className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-100"
                                  >
                                    <span>{panel.name}</span>
                                    <span className="text-xs text-slate-500">Panel</span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-slate-500">No panel matches.</div>
                              )}
                            </div>

                            {entry.panelName && (
                              <div className="mt-2 text-xs text-slate-600">
                                Selected: <span className="font-semibold">{entry.panelName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr] md:items-end">
                          <label className="text-sm font-medium text-slate-700">
                            Optional ID
                            <input
                              type="text"
                              value={entry.testId || entry.panelId || ""}
                              onChange={(e) => {
                                updateException(index, "testId", e.target.value);
                                updateException(index, "panelId", e.target.value);
                              }}
                              placeholder="Optional test/panel ID"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700">
                            Bonus %
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={entry.percentage}
                              onChange={(e) => updateException(index, "percentage", e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>{totalExceptions}</strong> exception{totalExceptions === 1 ? "" : "s"} configured. This policy will be used for referral bonus calculations in the payment flow.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}