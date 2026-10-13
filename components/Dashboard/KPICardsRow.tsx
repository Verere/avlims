"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardPeriod, DashboardPeriodFilter, KPI } from "../../types/dashboard";
import KPICard from "./KPICard";

type DashboardSummary = {
  orderCount: number;
  totalTestEntries: number;
  totalRevenue: number;
  totalBonus: number;
  totalBills: number;
  totalExpenses: number;
};

type DashboardOrder = {
  bDate?: string;
  createdAt?: string;
  patientId?: string;
  name?: string;
  tests?: Array<{ quantity?: number }>;
  revenue?: number;
  amount?: number;
  bonus?: number;
};

type DashboardBill = { amount?: number };
type DashboardBranch = { _id: string; lab?: string };

const iconPatients = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;
const iconTests = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>;
const iconRevenue = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01"/></svg>;
const iconBonus = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;
const iconBills = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 2h12a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V4a2 2 0 012-2z"/></svg>;
const iconExpenses = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 6h18M7 6V4m10 2V4M6 10h12v10H6z"/></svg>;
const iconPending = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>;
const iconCompleted = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;

export default function KPICardsRow({
  period,
  periodFilter,
  selectedMonth,
  onPeriodFilterChange,
  onMonthChange,
}: {
  period: DashboardPeriod | null;
  periodFilter: DashboardPeriodFilter;
  selectedMonth: string;
  onPeriodFilterChange: (filter: DashboardPeriodFilter) => void;
  onMonthChange: (month: string) => void;
}) {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branch = pathParts[1] || "";
  const [summary, setSummary] = useState<DashboardSummary>({
    orderCount: 0,
    totalTestEntries: 0,
    totalRevenue: 0,
    totalBonus: 0,
    totalBills: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = useMemo(
    () => (value: number) => `₦${Number(value || 0).toLocaleString()}`,
    []
  );
  const periodFrom = period?.from;
  const periodTo = period?.to;

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!branch) {
        setLoading(false);
        return;
      }
      if (!periodFrom || !periodTo) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) throw new Error("Branch not found");

        const branchDoc: DashboardBranch = await branchRes.json();
        if (!branchDoc?._id) throw new Error("Branch not found");

        const ordersRes = await fetch(`/api/test-orders?branchId=${encodeURIComponent(branchDoc._id)}`);
        const billsRes = await fetch(
          `/api/bill?branchId=${encodeURIComponent(branchDoc._id)}&from=${periodFrom}&to=${periodTo}`
        );
        const expensesRes = await fetch(
          `/api/expenses?branchId=${encodeURIComponent(branchDoc._id)}&labId=${encodeURIComponent(String(branchDoc.lab || branchDoc._id))}&from=${periodFrom}&to=${periodTo}`
        );

        if (!ordersRes.ok) throw new Error("Failed to load orders");
        if (!billsRes.ok) throw new Error("Failed to load bills");
        if (!expensesRes.ok) throw new Error("Failed to load expenses");

        const ordersData: unknown = await ordersRes.json();
        const billsData: unknown = await billsRes.json();
        const expensesData: unknown = await expensesRes.json();
        const orders = Array.isArray(ordersData) ? ordersData as DashboardOrder[] : [];
        const bills = Array.isArray(billsData) ? billsData as DashboardBill[] : [];
        const expenses = expensesData && typeof expensesData === "object"
          ? expensesData as { totalExpenses?: number }
          : {};

        const periodOrders = orders.filter((order) => {
          const businessDate = String(order.bDate || order.createdAt || "").slice(0, 10);
          return businessDate >= periodFrom && businessDate <= periodTo;
        });
        const patientIds = new Set(
          periodOrders
            .map((order) => String(order.patientId || order.name || "").trim().toLocaleLowerCase())
            .filter(Boolean)
        );

        const nextSummary: DashboardSummary = {
          orderCount: patientIds.size,
          totalTestEntries: periodOrders.reduce((sum, order) => {
            if (!Array.isArray(order.tests)) return sum;
            return sum + order.tests.reduce((testCount, test) => {
              const quantity = Number(test?.quantity);
              return testCount + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
            }, 0);
          }, 0),
          totalRevenue: periodOrders.reduce((sum, order) => sum + Number(order.revenue ?? order.amount ?? 0), 0),
          totalBonus: periodOrders.reduce((sum, order) => sum + Number(order.bonus ?? 0), 0),
          totalBills: bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
          totalExpenses: Number(expenses.totalExpenses || 0),
        };

        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch {
        if (!cancelled) {
          setSummary({ orderCount: 0, totalTestEntries: 0, totalRevenue: 0, totalBonus: 0, totalBills: 0, totalExpenses: 0 });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [branch, periodFrom, periodTo]);

  const periodLabel = periodFilter === "today"
    ? "Today"
    : new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const kpis: KPI[] = [
    { title: `Patients ${periodLabel}`, value: loading ? "..." : summary.orderCount, icon: iconPatients },
    { title: `Test Entries ${periodLabel}`, value: loading ? "..." : summary.totalTestEntries, icon: iconTests },
    { title: `Revenue ${periodLabel}`, value: loading ? "..." : formatCurrency(summary.totalRevenue), icon: iconRevenue },
    { title: `Referrer Bonus ${periodLabel}`, value: loading ? "..." : formatCurrency(summary.totalBonus), icon: iconBonus },
    { title: `Bills ${periodLabel}`, value: loading ? "..." : formatCurrency(summary.totalBills), icon: iconBills },
    { title: `Expenses ${periodLabel}`, value: loading ? "..." : formatCurrency(summary.totalExpenses), icon: iconExpenses },
    { title: "Pending Results", value: 7, icon: iconPending, trend: "-2%", trendType: "down" },
    { title: "Completed Tests", value: 51, icon: iconCompleted },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overview Summary</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {period ? `${period.from} – ${period.to}` : "Select a valid month"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Period
            <select
              value={periodFilter}
              onChange={(event) => onPeriodFilterChange(event.target.value as DashboardPeriodFilter)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="month">Month</option>
            </select>
          </label>
          {periodFilter === "month" ? (
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Month
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => onMonthChange(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          ) : null}
        </div>
      </div>
      <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <KPICard key={i} kpi={kpi} />
        ))}
      </section>
    </>
  );
}
