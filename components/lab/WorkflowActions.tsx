import React from "react";

interface WorkflowActionsProps {
  criticalUnacknowledged: boolean;
  isEditable: boolean;
  onSaveDraft: () => void;
  onValidate: () => void;
  onSubmitReview: () => void;
  onApprove: () => void;
  onRelease: () => void;
}

export default function WorkflowActions({
  criticalUnacknowledged,
  isEditable,
  onSaveDraft,
  onValidate,
  onSubmitReview,
  onApprove,
  onRelease,
}: WorkflowActionsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Workflow Actions</h3>
      <div className="grid w-full gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={onSaveDraft} className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-700 sm:w-auto">Save Draft</button>
        <button type="button" onClick={onValidate} className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 sm:w-auto">Validate Results</button>
        <button type="button" onClick={onSubmitReview} className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 sm:w-auto">Submit for Review</button>
        <button type="button" onClick={onApprove} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 sm:w-auto">Approve</button>
        <button type="button" onClick={onRelease} className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto">Release Report</button>
      </div>

      {criticalUnacknowledged ? <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-400">Critical values are present and must be acknowledged before release.</p> : null}
      {!isEditable ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Editing is disabled after approval/release unless correction privilege is enabled.</p> : null}
    </section>
  );
}
