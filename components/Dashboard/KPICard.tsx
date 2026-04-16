import React from "react";
import { KPI } from "../../types/dashboard";

interface KPICardProps {
  kpi: KPI;
}

export default function KPICard({ kpi }: KPICardProps) {
  return (
    <div
      className="flex items-center gap-4 bg-white rounded-xl shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer min-w-[180px]"
      tabIndex={0}
      aria-label={kpi.title}
    >
      <div className="text-3xl text-blue-600">{kpi.icon}</div>
      <div className="flex-1">
        <div className="text-gray-500 text-xs font-medium mb-1">{kpi.title}</div>
        <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
        {kpi.trend && (
          <div className={`text-xs mt-1 font-semibold flex items-center gap-1 ${kpi.trendType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {kpi.trendType === 'up' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 5v14m0 0l-7-7m7 7l7-7"/></svg>
            )}
            {kpi.trend}
          </div>
        )}
      </div>
    </div>
  );
}
