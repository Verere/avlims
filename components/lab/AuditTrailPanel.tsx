import React from "react";
import { AuditEvent } from "./types";

interface AuditTrailPanelProps {
  isOpen: boolean;
  events: AuditEvent[];
  onToggle: () => void;
}

export default function AuditTrailPanel({ isOpen, events, onToggle }: AuditTrailPanelProps) {
  return (
    <aside className={`w-full shrink-0 lg:w-[340px] ${isOpen ? "" : "lg:w-[80px]"}`}>
      <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left dark:border-slate-700">
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Audit Trail</span>
          <span className="text-xs font-semibold text-slate-500">{isOpen ? "Hide" : "Show"}</span>
        </button>

        {isOpen ? (
          <div className="max-h-[70vh] space-y-3 overflow-auto p-3">
            {events.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600">No audit entries yet.</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-slate-100">{event.timestamp}</strong>
                    <span className="text-xs text-slate-500">{event.user}</span>
                  </div>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">{event.action}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.previousValue} {"->"} {event.newValue}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
