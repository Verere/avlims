"use client";

import { useEffect, useState } from "react";

type Membership = {
  _id: string;
  labId: string;
  branchId: string;
  lab?: string;
  branch?: string;
};

type AuditEvent = {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
};

export default function AuditLogPanel({ memberships }: { memberships: Membership[] }) {
  const [membershipId, setMembershipId] = useState(memberships[0]?._id || "");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const selectedMembership = memberships.find((membership) => membership._id === membershipId);

  useEffect(() => {
    if (!selectedMembership) return;

    let cancelled = false;
    setError("");
    fetch(`/api/audit-logs?labId=${selectedMembership.labId}&branchId=${selectedMembership.branchId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load audit log");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMembership]);

  if (!memberships.length) return null;

  return (
    <section className="w-full max-w-5xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
        <select
          aria-label="Select lab branch audit log"
          className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          value={membershipId}
          onChange={(event) => setMembershipId(event.target.value)}
        >
          {memberships.map((membership) => (
            <option key={membership._id} value={membership._id}>
              {membership.lab || "Lab"} - {membership.branch || "Branch"}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!error && events.length === 0 ? <p className="text-sm text-gray-500">No audit events recorded yet.</p> : null}
      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Record</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id} className="border-b border-gray-100 text-gray-700">
                  <td className="px-3 py-3 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3">{event.actorName || event.actorEmail || "System"}</td>
                  <td className="px-3 py-3 capitalize">{event.action.replace("_", " ")}</td>
                  <td className="px-3 py-3">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}