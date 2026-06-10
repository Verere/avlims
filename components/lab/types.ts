export type ResultType = "numeric" | "qualitative" | "enumerated" | "text";
export type FlagType = "normal" | "borderline" | "abnormal" | "critical" | "high" | "low" | "none";
export type EntrySource = "Manual Entry" | "Imported from Analyzer" | "Corrected Result";
export type ValidationStatus = "Not Entered" | "Auto Validated" | "Needs Review" | "Validated";
export type WorkflowState = "Draft" | "Pending Review" | "Validated" | "Approved" | "Released";

export interface TestRow {
  id: string;
  testName: string;
  resultType: ResultType;
  result: string;
  unit: string;
  referenceRange: string;
  min?: number;
  max?: number;
  criticalLow?: number;
  criticalHigh?: number;
  flag: FlagType;
  entrySource: EntrySource;
  validationStatus: ValidationStatus;
  importedLocked?: boolean;
  criticalAcknowledged?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  previousValue: string;
  newValue: string;
}

export interface SampleMeta {
  sampleId: string;
  barcode: string;
  patientName: string;
  age: string;
  gender: string;
  referrer: string;
  collectionDate: string;
  testDepartment: string;
}
