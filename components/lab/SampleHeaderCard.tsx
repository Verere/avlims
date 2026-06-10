import React from "react";
import { SampleMeta, WorkflowState } from "./types";
import { statusBadge } from "./utils";

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <span className="block text-xs text-slate-500">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface SampleHeaderCardProps {
  sampleSearch: string;
  barcodeInput: string;
  workflow: WorkflowState;
  canCorrect: boolean;
  sampleMeta: SampleMeta;
  onSampleSearchChange: (value: string) => void;
  onBarcodeChange: (value: string) => void;
  onToggleCorrectionPrivilege: () => void;
}

export default function SampleHeaderCard({
  sampleSearch,
  barcodeInput,
  workflow,
  canCorrect,
  sampleMeta,
  onSampleSearchChange,
  onBarcodeChange,
  onToggleCorrectionPrivilege,
}: SampleHeaderCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Laboratory Information System</p>
          <h1 className="text-2xl font-bold">Result Entry Worksheet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(workflow)}`}>{workflow}</span>
          <button
            type="button"
            onClick={onToggleCorrectionPrivilege}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {canCorrect ? "Correction Privilege: ON" : "Correction Privilege: OFF"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search Accession</span>
          <input
            value={sampleSearch}
            onChange={(e) => onSampleSearchChange(e.target.value)}
            placeholder="Enter accession number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-cyan-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Barcode Scanner Input</span>
          <input
            value={barcodeInput}
            onChange={(e) => onBarcodeChange(e.target.value)}
            placeholder="Scan barcode"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-cyan-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <InfoCard label="Sample ID" value={sampleMeta.sampleId} />
        <InfoCard label="Barcode" value={sampleMeta.barcode} />
        <InfoCard label="Collection Date" value={sampleMeta.collectionDate} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoCard label="Patient Name" value={sampleMeta.patientName} />
        <InfoCard label="Age" value={sampleMeta.age} />
        <InfoCard label="Gender" value={sampleMeta.gender} />
        <InfoCard label="Referrer" value={sampleMeta.referrer} />
        <InfoCard label="Test Department" value={sampleMeta.testDepartment} />
      </div>
    </section>
  );
}
