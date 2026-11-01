"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

type Category = { _id: string; name: string };
type Member = { _id: string; name: string; role: string; user?: { _id: string; name?: string; email?: string }; worklistCategoryIds?: string[] };
type Item = { _id: string; orderTestId: string; patientId: string; patientName: string; orderNumber: string; testName: string; category: string; sampleId?: string; physicalSpecimenId?: string; accessionNumber?: string; specimenType?: string; specimenAcceptedAt?: string; priority: string; orderPriority?: string; orderDate: string; dueAt?: string; turnaroundHours?: number; status: string; eligibleForProcessing: boolean; eligibilityReason?: string; assignedStaffName?: string; assignedStaffId?: string; holdReason?: string };
type WorklistData = { categories: Category[]; selectedCategory?: Category; items: Item[]; total: number; page: number; pageSize: number; stats: { pending: number; inProgress: number; awaitingResults: number; completed: number; overdue: number }; staff: { id: string; name: string; role: string }[]; canManage: boolean; message?: string };

const dateText = (date?: string) => date ? new Date(date).toLocaleString() : "—";

export default function CategoryWorklistsWorkspace({ labSlug, branchSlug }: { labSlug: string; branchSlug: string }) {
  const [config, setConfig] = useState<{ categories: Category[]; memberships: Member[]; canManage: boolean } | null>(null);
  const [data, setData] = useState<WorklistData | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState(""); const [status, setStatus] = useState("All"); const [priority, setPriority] = useState("All");
  const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState(""); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [selected, setSelected] = useState<Item | null>(null);
  const [staffToAssign, setStaffToAssign] = useState(""); const [holdReason, setHoldReason] = useState(""); const [saving, setSaving] = useState(false);
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string[]>>({}); const [savingMember, setSavingMember] = useState("");
  const baseQuery = new URLSearchParams({ labSlug, branchSlug });

  const loadConfig = useCallback(async () => {
    const response = await fetch(`/api/category-worklists/config?${baseQuery}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load category access");
    setConfig(body);
    setCategoryId(current => current || body.categories?.[0]?._id || "");
    const assignments: Record<string, string[]> = {};
    for (const member of body.memberships || []) assignments[member._id] = (member.worklistCategoryIds || []).map(String);
    setCategoryAssignments(assignments);
  }, [labSlug, branchSlug]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ labSlug, branchSlug, page: String(page), pageSize: String(pageSize) });
    if (categoryId) params.set("categoryId", categoryId);
    if (q.trim()) params.set("q", q.trim());
    if (status !== "All") params.set("status", status);
    if (priority !== "All") params.set("priority", priority);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    try {
      const response = await fetch(`/api/category-worklists?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load category worklist");
      setData(body);
      if (!categoryId && body.categories?.length) setCategoryId(body.categories[0]._id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load category worklist"); }
    finally { setLoading(false); }
  }, [labSlug, branchSlug, categoryId, q, status, priority, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { void loadConfig().catch(e => setError(e.message)); }, [loadConfig]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [categoryId, q, status, priority, dateFrom, dateTo, pageSize]);

  async function itemAction(item: Item, action: string, extra: Record<string, unknown> = {}) {
    setSaving(true);
    try {
      const response = await fetch(`/api/category-worklists/${item._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update worklist item");
      setSelected(body); setHoldReason(""); toast.success(action === "start" ? "Processing started" : action === "complete" ? "Test processing completed" : "Worklist updated"); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update worklist item"); }
    finally { setSaving(false); }
  }

  async function saveMemberCategories(member: Member) {
    setSavingMember(member._id);
    try {
      const response = await fetch(`/api/category-worklists/config?${baseQuery}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId: member._id, categoryIds: categoryAssignments[member._id] || [] }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save category assignment");
      toast.success(`Category access updated for ${member.user?.name || member.name}`);
      await loadConfig();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save category assignment"); }
    finally { setSavingMember(""); }
  }

  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
  const cards = [["Pending", data?.stats.pending || 0, "text-amber-700"], ["In progress", data?.stats.inProgress || 0, "text-blue-700"], ["Awaiting results", data?.stats.awaitingResults || 0, "text-violet-700"], ["Completed", data?.stats.completed || 0, "text-emerald-700"], ["Overdue", data?.stats.overdue || 0, "text-rose-700"]] as const;

  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]">
    <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-teal-700">Laboratory workflow</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">Category Worklists</h1><p className="mt-1 text-slate-500">Process eligible tests in the categories assigned to your account.</p>
    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value, tone]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{loading ? "—" : value}</strong></div>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="rounded-xl border px-3 py-2.5"><option value="">Select category</option>{(data?.categories || config?.categories || []).map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Patient, order, accession, test or staff" className="min-w-0 rounded-xl border px-3 py-2.5 xl:col-span-2" />
      <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border px-3 py-2.5"><option value="All">All statuses</option>{["Awaiting Specimen", "Awaiting Processing", "Assigned", "In Progress", "Awaiting Result Entry", "On Hold", "Completed", "Cancelled"].map(value => <option key={value}>{value}</option>)}</select>
      <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-xl border px-3 py-2.5"><option value="All">All priorities</option>{["Routine", "Urgent", "STAT"].map(value => <option key={value}>{value}</option>)}</select>
      <label className="flex items-center gap-2 text-sm text-slate-500">Order date from<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2" /></label>
      <label className="flex items-center gap-2 text-sm text-slate-500">To<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2" /></label>
    </div>
    {error && <div role="alert" className="m-4 flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
    {data?.message && !data.total && <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.message}</div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Patient", "Order / ordered test", "Category", "Specimen / accession", "Order / processing priority", "Ordered", "Accepted", "Target", "Status", "Assigned staff", "Eligibility / reason", "Actions"].map(x => <th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
      {loading ? <tr><td colSpan={12} className="p-12 text-center text-slate-500">Loading worklist…</td></tr> : (data?.items || []).map(item => { const overdue = item.dueAt && new Date(item.dueAt) < new Date() && !["Completed", "Cancelled"].includes(item.status); return <tr key={item._id} onClick={() => setSelected(item)} className="cursor-pointer align-top hover:bg-blue-50/50"><td className="px-3 py-4"><strong>{item.patientName}</strong><div className="text-xs text-slate-500">{item.patientId}</div></td><td className="px-3 py-4"><strong>{item.orderNumber}</strong><div>{item.testName}</div><div className="text-xs text-slate-500">{item.orderTestId}</div></td><td className="px-3 py-4">{item.category}</td><td className="px-3 py-4">{item.specimenType || "Awaiting specimen"}<div className="text-xs text-slate-500">Specimen ID: {item.physicalSpecimenId || item.sampleId || "—"}</div><div className="text-xs text-slate-500">Accession: {item.accessionNumber || "—"}</div></td><td className="px-3 py-4"><div>Order: {item.orderPriority || "Routine"}</div><div className="text-xs text-slate-500">Processing: {item.priority}</div></td><td className="whitespace-nowrap px-3 py-4">{dateText(item.orderDate)}</td><td className="whitespace-nowrap px-3 py-4">{dateText(item.specimenAcceptedAt)}</td><td className={`whitespace-nowrap px-3 py-4 ${overdue ? "font-semibold text-rose-700" : ""}`}>{item.dueAt ? dateText(item.dueAt) : item.turnaroundHours ? `${item.turnaroundHours} hours` : "Not configured"}{overdue ? " · Overdue" : ""}</td><td className="px-3 py-4"><span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span></td><td className="px-3 py-4">{item.assignedStaffName || "Unassigned"}</td><td className="max-w-xs whitespace-normal px-3 py-4">{item.eligibilityReason || item.holdReason || (item.eligibleForProcessing ? "Eligible" : "Awaiting prerequisite")}</td><td className="px-3 py-4" onClick={e => e.stopPropagation()}>{item.eligibleForProcessing && ["Awaiting Processing", "Assigned"].includes(item.status) && <button onClick={() => void itemAction(item, "start")} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Start</button>}{["In Progress", "Awaiting Result Entry"].includes(item.status) && <Link href={`/${labSlug}/${branchSlug}/dashboard/worklists/${item._id}`} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Enter result</Link>}{item.status === "On Hold" && <button onClick={() => void itemAction(item, "resume")} className="rounded-lg border px-3 py-2 text-xs">Resume</button>}</td></tr>; })}
      {!loading && !error && !data?.items?.length && <tr><td colSpan={12} className="p-12 text-center"><strong>No worklist items found</strong><p className="mt-1 text-slate-500">Eligible ordered tests appear after registration or specimen acceptance.</p></td></tr>}
    </tbody></table></div>
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{data?.total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : "Showing 0 tests"}</span><div className="flex items-center gap-2"><label>Rows <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="rounded border px-2 py-1"><option>10</option><option>25</option><option>50</option><option>100</option></select></label><button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount || loading} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div></section>
    {config?.canManage && <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">Assign staff to categories</summary><p className="mt-2 text-sm text-slate-500">Staff can only see categories selected here. Managers and administrators can access all branch categories.</p><div className="mt-4 space-y-3">{config.memberships.map(member => <div key={member._id} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{member.user?.name || member.name}</strong><div className="text-xs capitalize text-slate-500">{member.role}</div></div><button disabled={savingMember === member._id} onClick={() => void saveMemberCategories(member)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingMember === member._id ? "Saving…" : "Save categories"}</button></div><div className="mt-3 flex flex-wrap gap-2">{config.categories.map(category => { const checked = (categoryAssignments[member._id] || []).includes(category._id); return <label key={category._id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setCategoryAssignments(current => ({ ...current, [member._id]: e.target.checked ? [...new Set([...(current[member._id] || []), category._id])] : (current[member._id] || []).filter(id => id !== category._id) }))} />{category.name}</label>; })}</div></div>)}</div></details>}
  </div>
  {selected && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(null)} className="float-right rounded border px-3 py-1">Close</button><p className="text-sm text-slate-500">{selected.category} · {selected.orderTestId}</p><h2 className="mt-1 text-2xl font-bold">{selected.testName}</h2><p className="text-slate-600">{selected.patientName} · {selected.patientId} · Order {selected.orderNumber}</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><p><span className="text-slate-500">Specimen ID</span><br />{selected.physicalSpecimenId || selected.sampleId || "Awaiting specimen"}</p><p><span className="text-slate-500">Accession number</span><br />{selected.accessionNumber || "—"}</p><p><span className="text-slate-500">Status</span><br />{selected.status}</p><p><span className="text-slate-500">Order priority</span><br />{selected.orderPriority || "Routine"}</p><p><span className="text-slate-500">Processing priority</span><br />{selected.priority}</p><p><span className="text-slate-500">Assigned staff</span><br />{selected.assignedStaffName || "Unassigned"}</p><p className="col-span-2"><span className="text-slate-500">Eligibility</span><br />{selected.eligibilityReason || "Eligible for processing"}</p></div>
    {selected.eligibleForProcessing && config?.canManage && data?.staff?.length ? <div className="mt-4 flex gap-2"><select value={staffToAssign} onChange={e => setStaffToAssign(e.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2"><option value="">Assign to staff…</option>{data.staff.map(staff => <option value={staff.id} key={staff.id}>{staff.name} · {staff.role}</option>)}</select><button disabled={!staffToAssign || saving} onClick={() => void itemAction(selected, "assign", { staffId: staffToAssign })} className="rounded-lg border px-3 py-2">Assign</button></div> : null}
    {selected.eligibleForProcessing && <button disabled={saving} onClick={() => void itemAction(selected, "assignToMe")} className="mt-3 rounded-lg border px-3 py-2 text-sm">Assign to me</button>}
    {selected.eligibleForProcessing && ["Awaiting Processing", "Assigned"].includes(selected.status) && <button disabled={saving} onClick={() => void itemAction(selected, "start")} className="ml-2 mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Start processing</button>}
    {selected.eligibleForProcessing && ["In Progress", "Awaiting Result Entry"].includes(selected.status) && <Link href={`/${labSlug}/${branchSlug}/dashboard/worklists/${selected._id}`} className="ml-2 mt-3 inline-block rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Open result entry</Link>}
    {selected.eligibleForProcessing && !["Completed", "Cancelled", "On Hold"].includes(selected.status) && <div className="mt-5"><label className="text-sm font-medium">Put on hold — reason required<textarea value={holdReason} onChange={e => setHoldReason(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={!holdReason.trim() || saving} onClick={() => void itemAction(selected, "hold", { reason: holdReason })} className="mt-2 rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-800">Place on hold</button></div>}
    {selected.status === "On Hold" && <div className="mt-5"><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hold reason: {selected.holdReason || selected.eligibilityReason}</p><button disabled={saving} onClick={() => void itemAction(selected, "resume")} className="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Resume work</button></div>}
    <p className="mt-6 text-xs text-slate-500">Completing this work item records result entry completion. Final report review and authorization remain separate.</p>
  </aside></div>}
  </main>;
}
