import React from "react";
import { Activity } from "../../types/dashboard";

const activities: Activity[] = [
  { id: "1", patient: "John Doe", tests: "CBC, Malaria", status: "Pending", paymentStatus: "Paid", time: "10:30 AM" },
  { id: "2", patient: "Jane Smith", tests: "Blood Sugar", status: "Completed", paymentStatus: "Paid", time: "09:50 AM" },
  { id: "3", patient: "Alice Johnson", tests: "Lipid Profile", status: "Pending", paymentStatus: "Unpaid", time: "09:20 AM" },
  { id: "4", patient: "Bob Lee", tests: "Urinalysis", status: "Completed", paymentStatus: "Paid", time: "08:45 AM" },
  { id: "5", patient: "Mary Kim", tests: "Malaria", status: "Pending", paymentStatus: "Unpaid", time: "08:10 AM" },
];

function statusBadge(status: string) {
  const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
  if (status === "Completed") return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  if (status === "Pending") return <span className={`${base} bg-yellow-100 text-yellow-700`}>Pending</span>;
  return <span className={base}>{status}</span>;
}
function paymentBadge(status: string) {
  const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
  if (status === "Paid") return <span className={`${base} bg-blue-100 text-blue-700`}>Paid</span>;
  if (status === "Unpaid") return <span className={`${base} bg-red-100 text-red-700`}>Unpaid</span>;
  return <span className={base}>{status}</span>;
}

export default function ActivityTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="py-2 px-3 text-left font-medium">Patient</th>
            <th className="py-2 px-3 text-left font-medium">Tests</th>
            <th className="py-2 px-3 text-left font-medium">Status</th>
            <th className="py-2 px-3 text-left font-medium">Payment</th>
            <th className="py-2 px-3 text-left font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">No recent activity.</td>
            </tr>
          ) : (
            activities.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-all">
                <td className="py-2 px-3 font-medium text-gray-900">{a.patient}</td>
                <td className="py-2 px-3">{a.tests}</td>
                <td className="py-2 px-3">{statusBadge(a.status)}</td>
                <td className="py-2 px-3">{paymentBadge(a.paymentStatus)}</td>
                <td className="py-2 px-3 text-gray-500">{a.time}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
