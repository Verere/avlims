import React from "react";
import { KPI } from "../../types/dashboard";

interface KPICardProps {
  kpi: KPI;
}

function getCardTheme(title: string) {
  const t = title.toLowerCase();
  if (t.includes("revenue")) {
    return {
      shell: "border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/40 dark:border-emerald-400/40 dark:from-emerald-950 dark:via-emerald-900/85 dark:to-teal-900/80",
      iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-200 dark:ring-emerald-300/40",
      tag: "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/20 dark:text-emerald-100",
      bar: "from-emerald-300 via-emerald-400 to-teal-300 dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-200",
    };
  }
  if (t.includes("bonus")) {
    return {
      shell: "border-amber-100 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/40 dark:border-amber-400/40 dark:from-amber-950 dark:via-amber-900/85 dark:to-orange-900/80",
      iconWrap: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-300/20 dark:text-amber-100 dark:ring-amber-300/40",
      tag: "bg-amber-100 text-amber-700 dark:bg-amber-300/20 dark:text-amber-50",
      bar: "from-amber-300 via-orange-300 to-yellow-200 dark:from-amber-300 dark:via-orange-300 dark:to-yellow-200",
    };
  }
  if (t.includes("bills")) {
    return {
      shell: "border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/40 dark:border-indigo-400/40 dark:from-indigo-950 dark:via-indigo-900/85 dark:to-violet-900/80",
      iconWrap: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-300/20 dark:text-indigo-100 dark:ring-indigo-300/40",
      tag: "bg-indigo-100 text-indigo-700 dark:bg-indigo-300/20 dark:text-indigo-50",
      bar: "from-indigo-300 via-violet-300 to-sky-200 dark:from-indigo-300 dark:via-violet-300 dark:to-sky-200",
    };
  }
  if (t.includes("expenses")) {
    return {
      shell: "border-orange-100 bg-gradient-to-br from-white via-orange-50/40 to-orange-100/40 dark:border-orange-400/40 dark:from-orange-950 dark:via-orange-900/85 dark:to-amber-900/80",
      iconWrap: "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-300/20 dark:text-orange-100 dark:ring-orange-300/40",
      tag: "bg-orange-100 text-orange-700 dark:bg-orange-300/20 dark:text-orange-50",
      bar: "from-orange-300 via-amber-300 to-yellow-200 dark:from-orange-300 dark:via-amber-300 dark:to-yellow-200",
    };
  }
  if (t.includes("pending")) {
    return {
      shell: "border-rose-100 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/40 dark:border-rose-400/40 dark:from-rose-950 dark:via-rose-900/85 dark:to-fuchsia-900/75",
      iconWrap: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-300/20 dark:text-rose-100 dark:ring-rose-300/40",
      tag: "bg-rose-100 text-rose-700 dark:bg-rose-300/20 dark:text-rose-50",
      bar: "from-rose-300 via-pink-300 to-fuchsia-200 dark:from-rose-300 dark:via-pink-300 dark:to-fuchsia-200",
    };
  }
  if (t.includes("completed")) {
    return {
      shell: "border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/40 dark:border-sky-400/40 dark:from-sky-950 dark:via-sky-900/85 dark:to-cyan-900/80",
      iconWrap: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-300/20 dark:text-sky-100 dark:ring-sky-300/40",
      tag: "bg-sky-100 text-sky-700 dark:bg-sky-300/20 dark:text-sky-50",
      bar: "from-sky-300 via-cyan-300 to-blue-200 dark:from-sky-300 dark:via-cyan-300 dark:to-blue-200",
    };
  }
  return {
    shell: "border-slate-200 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/30 dark:border-cyan-400/30 dark:from-slate-900 dark:via-slate-800/95 dark:to-blue-950/80",
    iconWrap: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-cyan-300/20 dark:text-cyan-100 dark:ring-cyan-300/40",
    tag: "bg-blue-100 text-blue-700 dark:bg-cyan-300/20 dark:text-cyan-50",
    bar: "from-cyan-300 via-sky-300 to-blue-200 dark:from-cyan-300 dark:via-sky-300 dark:to-blue-200",
  };
}

export default function KPICard({ kpi }: KPICardProps) {
  const theme = getCardTheme(kpi.title);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5 ${theme.shell}`}
      tabIndex={0}
      aria-label={kpi.title}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-90 dark:via-cyan-200/80" />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${theme.tag}`}>
          KPI
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${theme.iconWrap}`}>
          <span className="text-xl">{kpi.icon}</span>
        </div>
      </div>

      <div className="min-h-[78px]">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-200">{kpi.title}</div>
        <div className="text-2xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-[1.75rem]">{kpi.value}</div>

        {kpi.trend && (
          <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${kpi.trendType === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-300/20 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-300/20 dark:text-red-100'}`}>
            {kpi.trendType === 'up' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 5v14m0 0l-7-7m7 7l7-7"/></svg>
            )}
            {kpi.trend}
          </div>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/15">
        <div className={`h-full w-1/2 rounded-full bg-gradient-to-r transition-all duration-500 group-hover:w-3/4 ${theme.bar}`} />
      </div>
    </div>
  );
}
