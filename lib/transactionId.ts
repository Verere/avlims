export type TransactionIdReset = "never" | "yearly" | "monthly" | "daily";

export interface TransactionIdConfig {
  pattern: string;
  reset: TransactionIdReset;
  sequenceDigits: number;
}

export const DEFAULT_TRANSACTION_ID_CONFIG: TransactionIdConfig = {
  pattern: "{LAB}-{BRANCH}-{SEQ}",
  reset: "never",
  sequenceDigits: 4,
};

const TOKENS = new Set(["LAB", "BRANCH", "YYYY", "MM", "DD", "SEQ"]);

export function validateTransactionIdConfig(value: unknown): TransactionIdConfig | null {
  if (!value || typeof value !== "object") return null;
  const config = value as Record<string, unknown>;
  const pattern = typeof config.pattern === "string" ? config.pattern.trim() : "";
  const reset = config.reset;
  const sequenceDigits = Number(config.sequenceDigits);
  if (
    !pattern ||
    pattern.length > 100 ||
    !["never", "yearly", "monthly", "daily"].includes(String(reset)) ||
    !Number.isInteger(sequenceDigits) ||
    sequenceDigits < 1 ||
    sequenceDigits > 10
  ) return null;

  const tokens = Array.from(pattern.matchAll(/\{([^{}]+)\}/g), (match) => match[1]);
  if (tokens.some((token) => !TOKENS.has(token)) || pattern.replace(/\{[^{}]+\}/g, "").includes("{") || pattern.replace(/\{[^{}]+\}/g, "").includes("}")) {
    return null;
  }
  if (tokens.filter((token) => token === "SEQ").length !== 1) return null;
  if (reset === "yearly" && !tokens.includes("YYYY")) return null;
  if (reset === "monthly" && (!tokens.includes("YYYY") || !tokens.includes("MM"))) return null;
  if (reset === "daily" && (!tokens.includes("YYYY") || !tokens.includes("MM") || !tokens.includes("DD"))) return null;

  return { pattern, reset: reset as TransactionIdReset, sequenceDigits };
}

export function transactionIdPeriodKey(reset: TransactionIdReset, date: Date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  if (reset === "yearly") return year;
  if (reset === "monthly") return `${year}-${month}`;
  if (reset === "daily") return `${year}-${month}-${day}`;
  return "all";
}

export function renderTransactionId(
  config: TransactionIdConfig,
  values: { lab: string; branch: string; date: Date; sequence: number }
) {
  const tokens: Record<string, string> = {
    LAB: values.lab,
    BRANCH: values.branch,
    YYYY: String(values.date.getUTCFullYear()),
    MM: String(values.date.getUTCMonth() + 1).padStart(2, "0"),
    DD: String(values.date.getUTCDate()).padStart(2, "0"),
    SEQ: String(values.sequence).padStart(config.sequenceDigits, "0"),
  };
  return config.pattern.replace(/\{(LAB|BRANCH|YYYY|MM|DD|SEQ)\}/g, (_, token: string) => tokens[token]);
}

export function transactionIdPatternRegex(
  config: TransactionIdConfig,
  values: { lab: string; branch: string; date: Date }
) {
  const dateTokens: Record<string, string> = {
    LAB: values.lab,
    BRANCH: values.branch,
    YYYY: String(values.date.getUTCFullYear()),
    MM: String(values.date.getUTCMonth() + 1).padStart(2, "0"),
    DD: String(values.date.getUTCDate()).padStart(2, "0"),
  };
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = config.pattern.split(/(\{(?:LAB|BRANCH|YYYY|MM|DD|SEQ)\})/g);
  const expression = parts.map((part) => {
    const token = part.match(/^\{(LAB|BRANCH|YYYY|MM|DD|SEQ)\}$/)?.[1];
    return token === "SEQ" ? "(\\d+)" : token ? escapeRegex(dateTokens[token]) : escapeRegex(part);
  }).join("");
  return new RegExp(`^${expression}$`);
}
