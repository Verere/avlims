"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import AuditTrailPanel from "@/components/lab/AuditTrailPanel";
import CommentCard from "@/components/lab/CommentCard";
import ResultEntryGrid from "@/components/lab/ResultEntryGrid";
import SampleHeaderCard from "@/components/lab/SampleHeaderCard";
import WorkflowActions from "@/components/lab/WorkflowActions";
import { AuditEvent, SampleMeta, TestRow, WorkflowState } from "@/components/lab/types";
import { evaluateResult, INITIAL_TESTS, nowTime, PAGE_SIZE } from "@/components/lab/utils";

export default function LabResultEntryPage() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<TestRow[]>(INITIAL_TESTS);
  const [sampleSearch, setSampleSearch] = useState("ACC-2026-0001");
  const [barcodeInput, setBarcodeInput] = useState("BC-9011-6620");
  const [technicianComment, setTechnicianComment] = useState("");
  const [pathologistComment, setPathologistComment] = useState("");
  const [auditOpen, setAuditOpen] = useState(true);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowState>("Draft");
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState(1);
  const [canCorrect, setCanCorrect] = useState(false);
  const [overrideRowId, setOverrideRowId] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({});

  const sampleMeta = useMemo<SampleMeta>(
    () => ({
      sampleId: sampleSearch || "SMP-2026-004289",
      barcode: barcodeInput || "BC-004289-2026",
      patientName: "Amina Bello",
      age: "34",
      gender: "Female",
      referrer: "Dr Ibrahim Musa",
      collectionDate: "2026-06-05 08:06",
      testDepartment: "Hematology / Chemistry",
    }),
    [sampleSearch, barcodeInput]
  );

  const pagedTests = useMemo(() => tests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [tests, page]);
  const totalPages = Math.max(1, Math.ceil(tests.length / PAGE_SIZE));
  const criticalUnacknowledged = useMemo(() => tests.some((t) => t.flag === "critical" && !t.criticalAcknowledged), [tests]);
  const isEditable = !(workflow === "Approved" || workflow === "Released") || canCorrect;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function appendAudit(action: string, previousValue: string, newValue: string) {
    setAuditTrail((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: nowTime(),
        user: canCorrect ? "Dr Smith" : "Jane Doe",
        action,
        previousValue,
        newValue,
      },
      ...prev,
    ]);
  }

  function requestOverrideIfNeeded(row: TestRow) {
    if (row.entrySource === "Imported from Analyzer" && row.importedLocked) {
      setOverrideRowId(row.id);
      return true;
    }
    return false;
  }

  function handleResultChange(rowId: string, value: string) {
    const rowBefore = tests.find((r) => r.id === rowId);
    if (!rowBefore || !isEditable) return;
    if (requestOverrideIfNeeded(rowBefore)) return;

    const computed = evaluateResult(rowBefore, value);
    setTests((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, result: value, flag: computed.flag, validationStatus: computed.validationStatus } : row))
    );
    appendAudit(`entered ${rowBefore.testName}`, rowBefore.result || "-", value || "-");
    setDirty(true);
  }

  function moveToNextRow(rowId: string) {
    const index = pagedTests.findIndex((r) => r.id === rowId);
    if (index === -1) return;

    const next = pagedTests[index + 1];
    if (next) {
      inputRefs.current[next.id]?.focus();
      return;
    }

    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  }

  function handleAcknowledgeCritical(rowId: string) {
    const row = tests.find((r) => r.id === rowId);
    if (!row) return;

    setTests((prev) => prev.map((r) => (r.id === rowId ? { ...r, criticalAcknowledged: !r.criticalAcknowledged } : r)));
    appendAudit(
      `critical acknowledgement ${row.testName}`,
      row.criticalAcknowledged ? "Acknowledged" : "Unacknowledged",
      row.criticalAcknowledged ? "Unacknowledged" : "Acknowledged"
    );
    setDirty(true);
  }

  function handleSaveDraft() {
    setWorkflow("Draft");
    setDirty(false);
    appendAudit("saved draft", "Draft", "Draft");
  }

  function handleValidate() {
    setTests((prev) => prev.map((row) => (row.result ? { ...row, validationStatus: row.flag === "critical" ? "Needs Review" : "Validated" } : row)));
    setWorkflow("Validated");
    setDirty(true);
    appendAudit("validated results", "Pending", "Validated");
  }

  function handleSubmitReview() {
    setWorkflow("Pending Review");
    setDirty(true);
    appendAudit("submitted for review", "Draft", "Pending Review");
  }

  function handleApprove() {
    setWorkflow("Approved");
    setDirty(true);
    appendAudit("approved result", "Validated", "Approved");
  }

  function handleRelease() {
    if (criticalUnacknowledged) {
      window.alert("Cannot release report: critical results must be acknowledged.");
      return;
    }

    setWorkflow("Released");
    setDirty(false);
    appendAudit("released report", "Approved", "Released");
  }

  function handleCommentFormat(which: "tech" | "path", token: "bold" | "italic" | "bullet") {
    const marker = token === "bold" ? "**text**" : token === "italic" ? "_text_" : "- item";
    if (which === "tech") {
      setTechnicianComment((v) => `${v}${v ? "\n" : ""}${marker}`);
      appendAudit("updated technician comment", "edited", marker);
    } else {
      setPathologistComment((v) => `${v}${v ? "\n" : ""}${marker}`);
      appendAudit("updated pathologist comment", "edited", marker);
    }
    setDirty(true);
  }

  function confirmOverride() {
    if (!overrideRowId) return;
    setTests((prev) => prev.map((row) => (row.id === overrideRowId ? { ...row, importedLocked: false, entrySource: "Corrected Result" } : row)));
    appendAudit("override imported result", "Imported from Analyzer", "Corrected Result");
    setDirty(true);
    setOverrideRowId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading laboratory worksheet...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-4 md:px-6 md:py-5 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-4">
          <SampleHeaderCard
            sampleSearch={sampleSearch}
            barcodeInput={barcodeInput}
            workflow={workflow}
            canCorrect={canCorrect}
            sampleMeta={sampleMeta}
            onSampleSearchChange={setSampleSearch}
            onBarcodeChange={setBarcodeInput}
            onToggleCorrectionPrivilege={() => setCanCorrect((v) => !v)}
          />

          <ResultEntryGrid
            tests={tests}
            pagedTests={pagedTests}
            page={page}
            totalPages={totalPages}
            isEditable={isEditable}
            inputRefs={inputRefs}
            onResultChange={handleResultChange}
            onMoveNext={moveToNextRow}
            onRequestOverride={setOverrideRowId}
            onToggleCriticalAck={handleAcknowledgeCritical}
            onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <CommentCard
              title="Technician Comments"
              value={technicianComment}
              onChange={(v) => {
                setTechnicianComment(v);
                setDirty(true);
              }}
              onFormat={(token) => handleCommentFormat("tech", token)}
            />
            <CommentCard
              title="Pathologist Comments"
              value={pathologistComment}
              onChange={(v) => {
                setPathologistComment(v);
                setDirty(true);
              }}
              onFormat={(token) => handleCommentFormat("path", token)}
            />
          </section>

          <WorkflowActions
            criticalUnacknowledged={criticalUnacknowledged}
            isEditable={isEditable}
            onSaveDraft={handleSaveDraft}
            onValidate={handleValidate}
            onSubmitReview={handleSubmitReview}
            onApprove={handleApprove}
            onRelease={handleRelease}
          />
        </main>

        <AuditTrailPanel isOpen={auditOpen} events={auditTrail} onToggle={() => setAuditOpen((v) => !v)} />
      </div>

      {overrideRowId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h4 className="text-lg font-bold">Override Imported Result</h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This result came from analyzer import and is read-only. Confirm override to unlock and mark as corrected result.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOverrideRowId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
                Cancel
              </button>
              <button type="button" onClick={confirmOverride} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
