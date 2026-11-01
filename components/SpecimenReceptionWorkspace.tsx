"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

type TestDecision = { orderTestId: string; testName: string; category?: string; acceptanceStatus?: string; rejectionReason?: string; recollectionRequired?: boolean };
type Specimen = { _id: string; sampleId: string; physicalSpecimenId?: string; accessionNumber?: string; patientId: string; patientName: string; orderNumber: string; specimenType: string; container?: string; tests?: string[]; orderedTests?: TestDecision[]; status: string; priority: string; collectionAt?: string; collectedBy?: string; receivedAt?: string; receivingStaff?: string; department?: string; rejectionReason?: string; history?: { status: string; at: string; userName: string; note?: string }[] };
type Queue = { specimens: Specimen[]; total: number; page: number; pageSize: number; awaitingReceiptCount: number; acceptedCount: number; rejectedCount: number; recollectionRequiredCount: number; receivedTodayCount: number; specimenTypes: string[]; departments: string[]; acceptanceCriteria: string[]; rejectionReasons: string[] };

const statuses = ["Collected", "In Transit", "Received in Lab", "Partially Accepted", "Accepted", "Rejected"];
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString() : "—";

export default function SpecimenReceptionWorkspace({ labSlug, branchSlug }: { labSlug: string; branchSlug: string }) {
  const [data, setData] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [specimenType, setSpecimenType] = useState("All");
  const [department, setDepartment] = useState("All");
  const [priority, setPriority] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Specimen | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, { status: string; reason: string; recollectionRequired: boolean }>>({});
  const [criteriaText, setCriteriaText] = useState("");
  const [reasonsText, setReasonsText] = useState("");
  const [saving, setSaving] = useState(false);
  const baseQuery = `labSlug=${encodeURIComponent(labSlug)}&branchSlug=${encodeURIComponent(branchSlug)}`;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ labSlug, branchSlug, page: String(page), pageSize: String(pageSize), dateField: "receivedAt", queue: "reception" });
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    if (specimenType !== "All") params.set("specimenType", specimenType);
    if (department !== "All") params.set("department", department);
    if (priority !== "All") params.set("priority", priority);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    try {
      const response = await fetch(`/api/specimens?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load the specimen reception queue");
      setData(body);
      setCriteriaText((body.acceptanceCriteria || []).join("\n"));
      setReasonsText((body.rejectionReasons || []).join("\n"));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the specimen reception queue"); }
    finally { setLoading(false); }
  }, [labSlug, branchSlug, page, pageSize, query, status, specimenType, department, priority, dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, status, specimenType, department, priority, dateFrom, dateTo, pageSize]);
  useEffect(() => {
    setChecks({});
    setDecisions(Object.fromEntries((selected?.orderedTests || []).map(test => [test.orderTestId, { status: test.acceptanceStatus === "Accepted" || test.acceptanceStatus === "Rejected" ? test.acceptanceStatus : "", reason: test.rejectionReason || "", recollectionRequired: test.recollectionRequired === true }])));
  }, [selected]);

  async function action(actionName: "receive" | "assess") {
    if (!selected) return;
    const body: any = { id: selected._id, action: actionName };
    if (actionName === "assess") {
      const criteria = data?.acceptanceCriteria || [];
      if (criteria.some(item => checks[item] !== true)) return toast.error("Complete every acceptance check first.");
      body.checks = checks;
      body.decisions = (selected.orderedTests || []).map(test => ({ orderTestId: test.orderTestId, ...(decisions[test.orderTestId] || {}) }));
      if (body.decisions.some((decision: any) => !["Accepted", "Rejected"].includes(decision.status))) return toast.error("Choose an outcome for every ordered test.");
      if (body.decisions.some((decision: any) => decision.status === "Rejected" && !decision.reason?.trim())) return toast.error("Add a reason for every rejected test.");
      if (body.decisions.some((decision: any) => decision.status === "Rejected" && !decision.recollectionRequired) && !window.confirm("Some rejected tests will not be queued for recollection. Continue?")) return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/specimens?${baseQuery}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "Could not update specimen");
      setSelected(updated); toast.success(actionName === "receive" ? `Received and accessioned as ${updated.accessionNumber}` : `Assessment recorded: ${updated.status}`); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update specimen"); }
    finally { setSaving(false); }
  }

  async function saveConfiguration() {
    setSaving(true);
    try {
      const response = await fetch(`/api/specimens?${baseQuery}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "configureCriteria", acceptanceCriteria: criteriaText.split("\n").map(x => x.trim()).filter(Boolean), rejectionReasons: reasonsText.split("\n").map(x => x.trim()).filter(Boolean) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save reception criteria");
      toast.success("Reception criteria saved"); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save reception criteria"); }
    finally { setSaving(false); }
  }

  const cards = [
    ["Awaiting receipt", data?.awaitingReceiptCount ?? 0, "text-amber-700"],
    ["Accepted", data?.acceptedCount ?? 0, "text-emerald-700"],
    ["Rejected", data?.rejectedCount ?? 0, "text-rose-700"],
    ["Recollection required", data?.recollectionRequiredCount ?? 0, "text-violet-700"],
    ["Received today", data?.receivedTodayCount ?? 0, "text-blue-700"],
  ] as const;
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
  const canReceive = selected && ["Collected", "In Transit"].includes(selected.status);
  const canAssess = selected && selected.status === "Received in Lab";

  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]">
    <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-teal-700">Specimen workflow</p>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Specimen Reception</h1><p className="mt-1 text-slate-500">Identify collected specimens, assign accession numbers, and assess each requested test.</p></div><button onClick={() => window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium">Print current view</button></div>
    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value, tone]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{loading ? "—" : value}</strong></div>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Scan barcode or search specimen, accession, patient, order" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 xl:col-span-2" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="All">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
        <select value={specimenType} onChange={e => setSpecimenType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="All">All specimen types</option>{(data?.specimenTypes || []).map(s => <option key={s}>{s}</option>)}</select>
        <select value={department} onChange={e => setDepartment(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="All">All departments</option>{(data?.departments || []).map(s => <option key={s}>{s}</option>)}</select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="All">All priorities</option>{["Routine", "Urgent", "STAT"].map(s => <option key={s}>{s}</option>)}</select>
        <label className="flex items-center gap-2 text-sm text-slate-500">Received from<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-500">To<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2" /></label>
      </div>
      {error && <div role="alert" className="m-4 flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1550px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Specimen / accession", "Patient", "Order", "Specimen / container", "Tests", "Department", "Collected", "Collection staff", "Received", "Receiving staff", "Status", "Priority"].map(x => <th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {loading ? <tr><td colSpan={12} className="p-12 text-center text-slate-500">Loading specimen reception queue…</td></tr> : (data?.specimens || []).map(row => <tr key={row._id} onClick={() => setSelected(row)} className="cursor-pointer align-top hover:bg-blue-50/50"><td className="px-3 py-4"><div className="font-semibold">{row.physicalSpecimenId || row.sampleId}</div><div className="text-xs text-slate-500">{row.accessionNumber || "Awaiting accession"}</div></td><td className="px-3 py-4"><div className="font-semibold">{row.patientName}</div><div className="text-xs text-slate-500">{row.patientId}</div></td><td className="px-3 py-4">{row.orderNumber}</td><td className="px-3 py-4">{row.specimenType}<div className="text-xs text-slate-500">{row.container || "Container not specified"}</div></td><td className="max-w-xs whitespace-normal px-3 py-4">{row.orderedTests?.map(t => t.testName).join(", ") || row.tests?.join(", ") || "—"}</td><td className="px-3 py-4">{row.department || row.orderedTests?.map(t => t.category).filter(Boolean).join(", ") || "—"}</td><td className="whitespace-nowrap px-3 py-4">{dateLabel(row.collectionAt)}</td><td className="px-3 py-4">{row.collectedBy || "—"}</td><td className="whitespace-nowrap px-3 py-4">{dateLabel(row.receivedAt)}</td><td className="px-3 py-4">{row.receivingStaff || "—"}</td><td className="px-3 py-4"><span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{row.status}</span></td><td className="px-3 py-4">{row.priority}</td></tr>)}
        {!loading && !error && !data?.specimens?.length && <tr><td colSpan={12} className="p-12 text-center"><strong>No specimens found</strong><p className="mt-1 text-slate-500">Collected specimens will appear here when they are ready for reception.</p></td></tr>}
      </tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{data?.total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : "Showing 0 specimens"}</span><div className="flex items-center gap-2"><label>Rows <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="rounded border px-2 py-1"><option>10</option><option>25</option><option>50</option><option>100</option></select></label><button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount || loading} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
    </section>
    <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">Reception criteria and rejection reasons</summary><p className="mt-2 text-sm text-slate-500">These settings apply to the branch. Saving requires an administrator, manager, or owner role.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Acceptance checks, one per line<textarea value={criteriaText} onChange={e => setCriteriaText(e.target.value)} rows={6} className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm font-medium">Rejection reasons, one per line<textarea value={reasonsText} onChange={e => setReasonsText(e.target.value)} rows={6} className="mt-1 w-full rounded-lg border p-3" /></label></div><button disabled={saving} onClick={() => void saveConfiguration()} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save reception configuration</button></details>
  </div>
  {selected && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 sm:p-7" onClick={e => e.stopPropagation()}><div className="flex justify-between gap-4"><div><p className="text-sm text-slate-500">{selected.sampleId} · {selected.accessionNumber || "Not accessioned"}</p><h2 className="mt-1 text-2xl font-bold">{selected.patientName}</h2><p className="text-sm text-slate-500">Patient {selected.patientId} · Order {selected.orderNumber}</p></div><button onClick={() => setSelected(null)} className="h-9 rounded-lg border px-3">Close</button></div>
    <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><p><span className="text-slate-500">Specimen type</span><br />{selected.specimenType}</p><p><span className="text-slate-500">Container</span><br />{selected.container || "—"}</p><p><span className="text-slate-500">Collected</span><br />{dateLabel(selected.collectionAt)}</p><p><span className="text-slate-500">Collected by</span><br />{selected.collectedBy || "—"}</p><p><span className="text-slate-500">Received</span><br />{dateLabel(selected.receivedAt)}</p><p><span className="text-slate-500">Received by</span><br />{selected.receivingStaff || "—"}</p></div><button onClick={() => window.print()} className="mt-3 rounded-lg border px-3 py-2 text-sm">Reprint specimen label</button>
    <h3 className="mt-6 font-semibold">Ordered tests</h3><div className="mt-2 divide-y rounded-xl border">{(selected.orderedTests || []).map(test => { const decision = decisions[test.orderTestId] || { status: "", reason: "", recollectionRequired: false }; const reasons = data?.rejectionReasons || []; const customReason = !!decision.reason && decision.reason !== "Other" && !reasons.includes(decision.reason); return <div key={test.orderTestId} className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{test.testName}</strong><div className="text-xs text-slate-500">{test.category || selected.department || "Department not assigned"} · {test.acceptanceStatus || "Pending Review"}</div>{test.rejectionReason && <div className="mt-1 text-xs text-rose-700">Rejected: {test.rejectionReason}{test.recollectionRequired ? " · Recollection queued" : ""}</div>}</div>{canAssess && <select value={decision.status} onChange={e => setDecisions(current => ({ ...current, [test.orderTestId]: { ...decision, status: e.target.value } }))} className="rounded-lg border px-2 py-2"><option value="">Select decision</option><option>Accepted</option><option>Rejected</option></select>}</div>{canAssess && decision.status === "Rejected" && <div className="mt-2 grid gap-2 sm:grid-cols-2"><select value={customReason ? "Other" : decision.reason} onChange={e => setDecisions(current => ({ ...current, [test.orderTestId]: { ...decision, reason: e.target.value } }))} className="rounded-lg border px-2 py-2"><option value="">Select rejection reason</option>{reasons.filter(reason => reason !== "Other").map(reason => <option key={reason}>{reason}</option>)}<option>Other</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={decision.recollectionRequired} onChange={e => setDecisions(current => ({ ...current, [test.orderTestId]: { ...decision, recollectionRequired: e.target.checked } }))} />Recollection required</label>{(decision.reason === "Other" || customReason) && <input value={customReason ? decision.reason : ""} onChange={e => setDecisions(current => ({ ...current, [test.orderTestId]: { ...decision, reason: e.target.value } }))} placeholder="Describe the rejection reason" className="rounded-lg border px-2 py-2 sm:col-span-2" />}</div>}</div>; })}</div>
    {canReceive && <button disabled={saving} onClick={() => void action("receive")} className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Receive and assign accession"}</button>}
    {canAssess && <><h3 className="mt-6 font-semibold">Acceptance checks</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{(data?.acceptanceCriteria || []).map(criterion => <label key={criterion} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={checks[criterion] === true} onChange={e => setChecks(current => ({ ...current, [criterion]: e.target.checked }))} />{criterion}</label>)}</div><button disabled={saving} onClick={() => void action("assess")} className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save test decisions"}</button></>}
    {!canReceive && !canAssess && <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">This specimen is {selected.status}. Its reception decision is recorded and cannot be overwritten here.</p>}
    <h3 className="mt-7 font-semibold">Specimen history</h3>{(selected.history || []).slice().reverse().map((item, i) => <div key={`${item.at}-${i}`} className="mt-3 border-l-2 border-blue-500 pl-3 text-sm"><strong>{item.status}</strong><div className="text-slate-500">{dateLabel(item.at)} · {item.userName}</div>{item.note && <div>{item.note}</div>}</div>)}
  </aside></div>}
  </main>;
}
