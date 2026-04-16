import React from "react";
import { Alert } from "../../types/dashboard";

const alerts: Alert[] = [
  { id: "1", type: "danger", message: "3 payments pending!", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { id: "2", type: "warning", message: "2 delayed test results.", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"/></svg> },
  { id: "3", type: "danger", message: "Critical system issue!", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
];

function alertColor(type: string) {
  if (type === "danger") return "bg-red-50 border-red-200 text-red-700";
  if (type === "warning") return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-gray-50 border-gray-200 text-gray-700";
}

export default function AlertsPanel() {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Alerts</h2>
      <div className="flex flex-col gap-3">
        {alerts.length === 0 ? (
          <div className="text-gray-400 text-sm">No alerts.</div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center gap-3 border-l-4 rounded-xl p-3 shadow-sm ${alertColor(alert.type)}`}
              role="alert"
              aria-live="polite"
            >
              <span>{alert.icon}</span>
              <span className="font-medium">{alert.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
