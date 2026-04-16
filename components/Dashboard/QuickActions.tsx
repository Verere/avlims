import React from "react";

const actions = [
  { label: "Register Patient", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
  { label: "Add Test Order", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
  { label: "Add Referrer", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
  { label: "Record Payment", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
  { label: "Print Receipt", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
];

export default function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3 justify-end mb-6">
      {actions.map((action, i) => (
        <button
          key={i}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
          tabIndex={0}
          aria-label={action.label}
        >
          {action.icon}
          <span className="font-medium text-sm">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
