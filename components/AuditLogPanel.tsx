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
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestMethod?: string;
  requestPath?: string;
  ipAddress?: string;
  createdAt: string;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getEventSummary(event: AuditEvent) {
  const patientName = event.changes?.patientName as { before?: unknown; after?: unknown } | undefined;
  if (patientName?.after) return `Patient: ${String(patientName.after)}`;

  const fields = event.changes?.fields as Record<string, unknown> | undefined;
  if (fields && Object.keys(fields).length > 0) {
    return `${Object.keys(fields).map(formatLabel).join(", ")} updated`;
  }

  const changes = event.changes || {};
  if (changes.transId) return `Transaction: ${String(changes.transId)}`;
  if (changes.amount !== undefined) return `Amount: ${String(changes.amount)}`;
  if (changes.status) return `Status: ${String(changes.status)}`;
  return event.entityId ? `${event.entityType} #${event.entityId}` : event.entityType;
}

export default function AuditLogPanel({ memberships }: { memberships: Membership[] }) {
  const [membershipId, setMembershipId] = useState(memberships[0]?._id || "");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const selectedMembership = memberships.find((membership) => membership._id === membershipId);

  const entityTypes = Array.from(new Set(events.map((event) => event.entityType))).sort();
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    if (actionFilter !== "all" && event.action !== actionFilter) return false;
    if (entityFilter !== "all" && event.entityType !== entityFilter) return false;
    if (!normalizedSearchQuery) return true;
    return [event.actorName, event.actorEmail, event.entityType, event.entityId, getEventSummary(event)]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
  });

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
    <section className="w-full max-w-6xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
          <p className="mt-1 text-sm text-gray-500">Branch activity and record changes</p>
        </div>
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

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search activity"
          aria-label="Search audit log"
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select aria-label="Filter audit actions" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
          <option value="all">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="status_change">Status changed</option>
        </select>
        <select aria-label="Filter audit modules" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
          <option value="all">All modules</option>
          {entityTypes.map((entityType) => <option key={entityType} value={entityType}>{entityType}</option>)}
        </select>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!error && events.length === 0 ? <p className="text-sm text-gray-500">No audit events recorded yet.</p> : null}
      {!error && events.length > 0 && filteredEvents.length === 0 ? <p className="text-sm text-gray-500">No audit events match these filters.</p> : null}
      {filteredEvents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Module</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Summary</th>
                <th className="px-3 py-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event._id} className="border-b border-gray-100 text-gray-700">
                  <td className="px-3 py-3 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3">{event.actorName || event.actorEmail || "System"}</td>
                  <td className="px-3 py-3">{event.entityType}</td>
                  <td className="px-3 py-3 capitalize">{event.action.replace("_", " ")}</td>
                  <td className="px-3 py-3">{getEventSummary(event)}</td>
                  <td className="px-3 py-3"><button type="button" onClick={() => setSelectedEvent(event)} className="text-sm font-semibold text-blue-700 hover:underline">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-bold text-slate-900">Audit Event Details</h3><p className="mt-1 text-sm text-slate-500">{getEventSummary(selectedEvent)}</p></div>
              <button type="button" onClick={() => setSelectedEvent(null)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Close</button>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Recorded</dt><dd className="font-medium text-slate-900">{new Date(selectedEvent.createdAt).toLocaleString()}</dd></div>
              <div><dt className="text-slate-500">Actor</dt><dd className="font-medium text-slate-900">{selectedEvent.actorName || selectedEvent.actorEmail || "System"}</dd></div>
              <div><dt className="text-slate-500">Action</dt><dd className="font-medium capitalize text-slate-900">{selectedEvent.action.replace("_", " ")}</dd></div>
              <div><dt className="text-slate-500">Record</dt><dd className="font-medium text-slate-900">{selectedEvent.entityType}{selectedEvent.entityId ? ` #${selectedEvent.entityId}` : ""}</dd></div>
            </dl>
            <div className="mt-5"><p className="mb-2 text-sm font-semibold text-slate-700">Recorded changes</p><pre className="max-h-72 overflow-auto bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(selectedEvent.changes || selectedEvent.metadata || {}, null, 2)}</pre></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}