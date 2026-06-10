"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { KPI } from "../../types/dashboard";
import KPICard from "./KPICard";

type DashboardSummary = {
  orderCount: number;
  totalTests: number;
  totalRevenue: number;
  totalBonus: number;
  totalBills: number;
  totalExpenses: number;
};

const iconPatients = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;
const iconTests = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>;
const iconRevenue = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01"/></svg>;
const iconBonus = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;
const iconBills = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 2h12a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V4a2 2 0 012-2z"/></svg>;
const iconExpenses = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 6h18M7 6V4m10 2V4M6 10h12v10H6z"/></svg>;
const iconPending = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>;
const iconCompleted = <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>;

export default function KPICardsRow() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const branch = pathParts[1] || "";
  const [summary, setSummary] = useState<DashboardSummary>({
    orderCount: 0,
    totalTests: 0,
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

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!branch) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) throw new Error("Branch not found");

        const branchDoc = await branchRes.json();
        if (!branchDoc?._id) throw new Error("Branch not found");

        const ordersRes = await fetch(`/api/test-orders?branchId=${encodeURIComponent(branchDoc._id)}`);
        const todayYmd = new Date().toISOString().slice(0, 10);
        const billsRes = await fetch(`/api/bill?branchId=${encodeURIComponent(branchDoc._id)}&date=${todayYmd}`);
        const expensesRes = await fetch(
          `/api/expenses?labId=${encodeURIComponent(String(branchDoc.lab || branchDoc._id))}&date=${todayYmd}`
        );

        if (!ordersRes.ok) throw new Error("Failed to load orders");

        const orders = await ordersRes.json();
        const bills = billsRes.ok ? await billsRes.json() : [];
        const expenses = expensesRes.ok ? await expensesRes.json() : { totalExpenses: 0 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todaysOrders = Array.isArray(orders)
          ? orders.filter((order: any) => {
              const dateValue = order.bDate || order.createdAt;
              if (!dateValue) return false;
              const orderDate = new Date(dateValue);
              return !Number.isNaN(orderDate.getTime()) && orderDate >= today && orderDate < tomorrow;
            })
          : [];

        const nextSummary: DashboardSummary = {
          orderCount: todaysOrders.length,
          totalTests: todaysOrders.reduce((sum: number, order: any) => {
            if (!Array.isArray(order.tests) || order.tests.length === 0) return sum;

            const panelIds = new Set<string>();
            let orderTestCount = 0;

            for (const test of order.tests) {
              const panelId = test?.panel?.id;
              if (panelId) {
                if (!panelIds.has(panelId)) {
                  panelIds.add(panelId);
                  orderTestCount += 1;
                }
              } else {
                orderTestCount += 1;
              }
            }

            return sum + orderTestCount;
          }, 0),
          totalRevenue: todaysOrders.reduce((sum: number, order: any) => sum + Number(order.revenue ?? order.amount ?? 0), 0),
          totalBonus: todaysOrders.reduce((sum: number, order: any) => sum + Number(order.bonus ?? 0), 0),
          totalBills: Array.isArray(bills)
            ? bills.reduce((sum: number, bill: any) => sum + Number(bill?.amount || 0), 0)
            : 0,
          totalExpenses: Number(expenses?.totalExpenses || 0),
        };

        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch {
        if (!cancelled) {
          setSummary({ orderCount: 0, totalTests: 0, totalRevenue: 0, totalBonus: 0, totalBills: 0, totalExpenses: 0 });
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
  }, [branch]);

  const kpis: KPI[] = [
    { title: "Patients Today", value: loading ? "..." : summary.orderCount, icon: iconPatients },
    { title: "Tests Ordered", value: loading ? "..." : summary.totalTests, icon: iconTests },
    { title: "Revenue Today", value: loading ? "..." : formatCurrency(summary.totalRevenue), icon: iconRevenue },
    { title: "Referrer Bonus", value: loading ? "..." : formatCurrency(summary.totalBonus), icon: iconBonus },
    { title: "Bills Today", value: loading ? "..." : formatCurrency(summary.totalBills), icon: iconBills },
    { title: "Expenses Today", value: loading ? "..." : formatCurrency(summary.totalExpenses), icon: iconExpenses },
    { title: "Pending Results", value: 7, icon: iconPending, trend: "-2%", trendType: "down" },
    { title: "Completed Tests", value: 51, icon: iconCompleted },
  ];

  return (
    <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 2xl:grid-cols-6">
      {kpis.map((kpi, i) => (
        <KPICard key={i} kpi={kpi} />
      ))}
    </section>
  );
}
