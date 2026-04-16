import React from "react";
import { KPI } from "../../types/dashboard";
import KPICard from "./KPICard";

const kpis: KPI[] = [
  { title: "Patients Today", value: 32, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg>, trend: "+12%", trendType: "up" },
  { title: "Tests Ordered", value: 58, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>, trend: "+8%", trendType: "up" },
  { title: "Revenue Today", value: "₦120,000", icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01"/></svg>, trend: "+5%", trendType: "up" },
  { title: "Referrer Bonus", value: "₦8,000", icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg> },
  { title: "Pending Results", value: 7, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 3v4M8 3v4m-5 4h18"/></svg>, trend: "-2%", trendType: "down" },
  { title: "Completed Tests", value: 51, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8"/></svg> },
];

export default function KPICardsRow() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {kpis.map((kpi, i) => (
        <KPICard key={i} kpi={kpi} />
      ))}
    </section>
  );
}
