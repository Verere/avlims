import React from "react";
import { ENUM_OPTIONS, flagVisual, QUALITATIVE_OPTIONS, sourceBadge } from "./utils";
import { TestRow } from "./types";

type InputRef = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;

interface ResultEntryGridProps {
  tests: TestRow[];
  pagedTests: TestRow[];
  page: number;
  totalPages: number;
  isEditable: boolean;
  inputRefs: React.MutableRefObject<Record<string, InputRef>>;
  onResultChange: (rowId: string, value: string) => void;
  onMoveNext: (rowId: string) => void;
  onRequestOverride: (rowId: string) => void;
  onToggleCriticalAck: (rowId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function ResultEntryGrid({
  tests,
  pagedTests,
  page,
  totalPages,
  isEditable,
  inputRefs,
  onResultChange,
  onMoveNext,
  onRequestOverride,
  onToggleCriticalAck,
  onPreviousPage,
  onNextPage,
}: ResultEntryGridProps) {
  const renderResultInput = (row: TestRow) => (
    <>
      {row.resultType === "numeric" ? (
        <input
          ref={(el) => {
            inputRefs.current[row.id] = el;
          }}
          type="number"
          step="0.01"
          min={row.min}
          max={row.max}
          value={row.result}
          disabled={!isEditable || !!row.importedLocked}
          onChange={(e) => onResultChange(row.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onMoveNext(row.id);
            }
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 outline-none ring-cyan-400 focus:ring-2 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-800/40 sm:w-40"
        />
      ) : null}

      {row.resultType === "qualitative" ? (
        <select
          ref={(el) => {
            inputRefs.current[row.id] = el;
          }}
          value={row.result}
          disabled={!isEditable || !!row.importedLocked}
          onChange={(e) => onResultChange(row.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onMoveNext(row.id);
            }
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 outline-none ring-cyan-400 focus:ring-2 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-800/40 sm:w-56"
        >
          <option value="">Select</option>
          {QUALITATIVE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : null}

      {row.resultType === "enumerated" ? (
        <select
          ref={(el) => {
            inputRefs.current[row.id] = el;
          }}
          value={row.result}
          disabled={!isEditable || !!row.importedLocked}
          onChange={(e) => onResultChange(row.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onMoveNext(row.id);
            }
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 outline-none ring-cyan-400 focus:ring-2 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-800/40 sm:w-44"
        >
          <option value="">Select</option>
          {ENUM_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : null}

      {row.resultType === "text" ? (
        <textarea
          ref={(el) => {
            inputRefs.current[row.id] = el;
          }}
          value={row.result}
          rows={2}
          disabled={!isEditable || !!row.importedLocked}
          onChange={(e) => onResultChange(row.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onMoveNext(row.id);
            }
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 outline-none ring-cyan-400 focus:ring-2 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-800/40"
        />
      ) : null}
    </>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Result Entry Grid</h2>
      </div>

      {tests.length === 0 ? (
        <div className="px-4 py-10 text-center text-slate-500">No ordered tests found for this sample.</div>
      ) : (
        <>
          <div className="space-y-3 p-3 md:hidden">
            {pagedTests.map((row) => {
              const visual = flagVisual(row.flag);
              return (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.testName}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${visual.cls}`}>
                      {visual.icon ? <span>{visual.icon}</span> : null}
                      <span>{visual.label}</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Result</p>
                      {renderResultInput(row)}
                    </div>

                    {row.entrySource === "Imported from Analyzer" && row.importedLocked ? (
                      <button
                        type="button"
                        className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        onClick={() => onRequestOverride(row.id)}
                      >
                        Override
                      </button>
                    ) : null}

                    {row.flag === "critical" ? (
                      <button
                        type="button"
                        onClick={() => onToggleCriticalAck(row.id)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${row.criticalAcknowledged ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}
                      >
                        {row.criticalAcknowledged ? "Acknowledged" : "Acknowledge"}
                      </button>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Unit</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.unit || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Reference Range</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.referenceRange || "-"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sourceBadge(row.entrySource)}`}>{row.entrySource}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">{row.validationStatus}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden max-h-[460px] overflow-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2 text-left">Test Name</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-left">Reference Range</th>
                <th className="px-3 py-2 text-left">Flag</th>
                <th className="px-3 py-2 text-left">Entry Source</th>
                <th className="px-3 py-2 text-left">Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedTests.map((row) => {
                const visual = flagVisual(row.flag);
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium">{row.testName}</td>
                    <td className="px-3 py-2">{renderResultInput(row)}

                      {row.entrySource === "Imported from Analyzer" && row.importedLocked ? (
                        <button
                          type="button"
                          className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          onClick={() => onRequestOverride(row.id)}
                        >
                          Override
                        </button>
                      ) : null}

                      {row.flag === "critical" ? (
                        <button
                          type="button"
                          onClick={() => onToggleCriticalAck(row.id)}
                          className={`ml-2 rounded-md px-2 py-1 text-xs font-semibold ${row.criticalAcknowledged ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}
                        >
                          {row.criticalAcknowledged ? "Acknowledged" : "Acknowledge"}
                        </button>
                      ) : null}
                    </td>

                    <td className="px-3 py-2">{row.unit || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.referenceRange || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${visual.cls}`}>
                        {visual.icon ? <span>{visual.icon}</span> : null}
                        <span>{visual.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${sourceBadge(row.entrySource)}`}>{row.entrySource}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">{row.validationStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center dark:border-slate-700">
        <span className="text-slate-600 dark:text-slate-300">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={onPreviousPage} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={onNextPage} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600">Next</button>
        </div>
      </div>
    </section>
  );
}
