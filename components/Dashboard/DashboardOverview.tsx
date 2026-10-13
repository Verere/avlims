"use client";

import { useMemo, useState } from "react";
import Charts from "./Charts";
import KPICardsRow from "./KPICardsRow";
import type { DashboardPeriod, DashboardPeriodFilter } from "@/types/dashboard";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardOverview() {
  const [periodFilter, setPeriodFilter] = useState<DashboardPeriodFilter>("today");
  const [selectedMonth, setSelectedMonth] = useState(() => formatLocalDate(new Date()).slice(0, 7));

  const period = useMemo<DashboardPeriod | null>(() => {
    if (periodFilter === "today") {
      const today = formatLocalDate(new Date());
      return { from: today, to: today };
    }
    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) return null;
    const [year, month] = selectedMonth.split("-").map(Number);
    return {
      from: `${selectedMonth}-01`,
      to: formatLocalDate(new Date(year, month, 0)),
    };
  }, [periodFilter, selectedMonth]);

  return (
    <>
      <KPICardsRow
        period={period}
        periodFilter={periodFilter}
        selectedMonth={selectedMonth}
        onPeriodFilterChange={setPeriodFilter}
        onMonthChange={setSelectedMonth}
      />
      <Charts period={period} />
    </>
  );
}
