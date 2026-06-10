import { EntrySource, FlagType, TestRow, ValidationStatus, WorkflowState } from "./types";

export const QUALITATIVE_OPTIONS = ["Positive", "Negative", "Reactive", "Non-Reactive", "Indeterminate"];
export const ENUM_OPTIONS = ["Normal", "High", "Low", "Critical"];
export const PAGE_SIZE = 8;

export const INITIAL_TESTS: TestRow[] = [
  { id: "hb", testName: "Hemoglobin", resultType: "numeric", result: "", unit: "g/dL", referenceRange: "12.0 - 16.0", min: 12, max: 16, criticalLow: 7, criticalHigh: 20, flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "wbc", testName: "WBC", resultType: "numeric", result: "", unit: "x10^9/L", referenceRange: "4.0 - 11.0", min: 4, max: 11, criticalLow: 2, criticalHigh: 30, flag: "none", entrySource: "Imported from Analyzer", validationStatus: "Not Entered", importedLocked: true },
  { id: "hiv", testName: "HIV Screen", resultType: "qualitative", result: "", unit: "", referenceRange: "Non-Reactive", flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "malaria", testName: "Malaria Parasite", resultType: "enumerated", result: "", unit: "", referenceRange: "Normal", flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "commentary", testName: "Peripheral Smear Notes", resultType: "text", result: "", unit: "", referenceRange: "", flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "platelet", testName: "Platelet Count", resultType: "numeric", result: "", unit: "x10^9/L", referenceRange: "150 - 450", min: 150, max: 450, criticalLow: 50, criticalHigh: 1000, flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "esr", testName: "ESR", resultType: "numeric", result: "", unit: "mm/hr", referenceRange: "0 - 20", min: 0, max: 20, criticalLow: -1, criticalHigh: 100, flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "hbsag", testName: "HBsAg", resultType: "qualitative", result: "", unit: "", referenceRange: "Negative", flag: "none", entrySource: "Imported from Analyzer", validationStatus: "Not Entered", importedLocked: true },
  { id: "urea", testName: "Urea", resultType: "numeric", result: "", unit: "mg/dL", referenceRange: "10 - 50", min: 10, max: 50, criticalLow: 3, criticalHigh: 150, flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "creatinine", testName: "Creatinine", resultType: "numeric", result: "", unit: "mg/dL", referenceRange: "0.6 - 1.3", min: 0.6, max: 1.3, criticalLow: 0.2, criticalHigh: 8, flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "culture", testName: "Urine Culture", resultType: "enumerated", result: "", unit: "", referenceRange: "Normal", flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
  { id: "path-note", testName: "Pathology Narrative", resultType: "text", result: "", unit: "", referenceRange: "", flag: "none", entrySource: "Manual Entry", validationStatus: "Not Entered" },
];

export function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function flagVisual(flag: FlagType) {
  switch (flag) {
    case "normal":
      return { label: "Normal", icon: "OK", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" };
    case "borderline":
      return { label: "Borderline", icon: "!", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
    case "high":
      return { label: "High", icon: "!!", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
    case "low":
      return { label: "Low", icon: "!!", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
    case "abnormal":
      return { label: "Abnormal", icon: "!!", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
    case "critical":
      return { label: "Critical", icon: "!!!", cls: "bg-red-900 text-red-50 dark:bg-red-700 dark:text-white" };
    default:
      return { label: "-", icon: "", cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200" };
  }
}

export function sourceBadge(source: EntrySource) {
  if (source === "Imported from Analyzer") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (source === "Corrected Result") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

export function statusBadge(status: WorkflowState) {
  if (status === "Released") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "Approved") return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  if (status === "Validated") return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (status === "Pending Review") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

export function evaluateResult(row: TestRow, value: string): { flag: FlagType; validationStatus: ValidationStatus } {
  if (!value) return { flag: "none", validationStatus: "Not Entered" };

  if (row.resultType === "numeric") {
    const num = Number(value);
    if (Number.isNaN(num)) return { flag: "abnormal", validationStatus: "Needs Review" };
    if ((row.criticalLow !== undefined && num <= row.criticalLow) || (row.criticalHigh !== undefined && num >= row.criticalHigh)) {
      return { flag: "critical", validationStatus: "Needs Review" };
    }

    if (row.min !== undefined && row.max !== undefined) {
      const range = row.max - row.min;
      const boundary = Math.max(range * 0.1, 0.1);
      if (num < row.min) return { flag: "low", validationStatus: "Needs Review" };
      if (num > row.max) return { flag: "high", validationStatus: "Needs Review" };
      if (num <= row.min + boundary || num >= row.max - boundary) return { flag: "borderline", validationStatus: "Auto Validated" };
    }

    return { flag: "normal", validationStatus: "Auto Validated" };
  }

  if (row.resultType === "qualitative") {
    if (value === "Negative" || value === "Non-Reactive") return { flag: "normal", validationStatus: "Auto Validated" };
    if (value === "Indeterminate") return { flag: "critical", validationStatus: "Needs Review" };
    return { flag: "abnormal", validationStatus: "Needs Review" };
  }

  if (row.resultType === "enumerated") {
    if (value === "Normal") return { flag: "normal", validationStatus: "Auto Validated" };
    if (value === "Critical") return { flag: "critical", validationStatus: "Needs Review" };
    if (value === "High") return { flag: "high", validationStatus: "Needs Review" };
    if (value === "Low") return { flag: "low", validationStatus: "Needs Review" };
  }

  return { flag: value.trim() ? "borderline" : "none", validationStatus: value.trim() ? "Needs Review" : "Not Entered" };
}
