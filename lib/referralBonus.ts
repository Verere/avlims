export type ReferralBonusException = {
  type?: "test" | "panel";
  testId?: string;
  testName?: string;
  panelId?: string;
  panelName?: string;
  percentage: number;
};

export type ReferralBonusPolicy = {
  defaultPercentage: number;
  exceptions: ReferralBonusException[];
};

function normalize(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export function getReferralBonusPercentageForItem(
  item: {
    test?: { id?: string; name?: string; price?: number };
    panel?: { id?: string; name?: string; price?: number };
    quantity?: number;
  },
  policy?: ReferralBonusPolicy
): number {
  const safePolicy = policy || { defaultPercentage: 0, exceptions: [] };
  const defaultPercentage = Number(safePolicy.defaultPercentage || 0);
  const exceptions = Array.isArray(safePolicy.exceptions) ? safePolicy.exceptions : [];

  const itemId = item?.panel?.id || item?.test?.id || "";
  const itemName = item?.panel?.name || item?.test?.name || "";
  const panelId = item?.panel?.id || "";
  const panelName = item?.panel?.name || "";

  const match = exceptions.find((entry) => {
    const percentage = Number(entry?.percentage ?? 0);
    if (!Number.isFinite(percentage)) return false;

    const entryType = entry?.type;

    if (entryType === "test") {
      if (entry?.testId && itemId && normalize(entry.testId) === normalize(itemId)) return true;
      if (entry?.testName && itemName && normalize(entry.testName) === normalize(itemName)) return true;
      return false;
    }

    if (entryType === "panel") {
      if (entry?.panelId && panelId && normalize(entry.panelId) === normalize(panelId)) return true;
      if (entry?.panelName && panelName && normalize(entry.panelName) === normalize(panelName)) return true;
      return false;
    }

    if (entry?.testId && itemId && normalize(entry.testId) === normalize(itemId)) {
      return true;
    }

    if (entry?.testName && itemName && normalize(entry.testName) === normalize(itemName)) {
      return true;
    }

    if (entry?.panelId && panelId && normalize(entry.panelId) === normalize(panelId)) {
      return true;
    }

    if (entry?.panelName && panelName && normalize(entry.panelName) === normalize(panelName)) {
      return true;
    }

    return false;
  });

  return match ? Number(match.percentage || 0) : defaultPercentage;
}

export function getReferralBonusAmountForItem(
  item: {
    test?: { id?: string; name?: string; price?: number };
    panel?: { id?: string; name?: string; price?: number };
    quantity?: number;
  },
  policy?: ReferralBonusPolicy
): number {
  const itemAmount = item?.panel
    ? Number(item.panel.price || 0)
    : Number(item.test?.price || 0) * Number(item.quantity || 1);

  const percentage = getReferralBonusPercentageForItem(item, policy);
  return Math.round(itemAmount * (percentage / 100));
}
