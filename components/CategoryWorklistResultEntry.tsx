"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Detail = { item: any; order: any; patient: any; test: any; specimen: any; resultTemplate: any; canManage: boolean };

export default function CategoryWorklistResultEntry({ labSlug, branchSlug, itemId }: { labSlug: string; branchSlug: string; itemId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [result, setResult] = useState<any>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/category-worklists/${itemId}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load this worklist item");
        if (!active) return;
        setDetail(body);
        const stored = body.item?.result;
        if (stored && typeof stored === "object") setResult({ findings: "", impression: "", conclusion: "", sections: {}, ...stored });
        else setResult(stored || "");
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not load this worklist item"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [itemId]);

  async function update(action: "saveResult" | "complete") {
    setSaving(true);
    try {
      const response = await fetch(`/api/category-worklists/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, result }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save result");
      setDetail(current => current ? { ...current, item: body } : current);
      setSaved(true);
      toast.success(action === "complete" ? "Result entry completed" : "Result saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save result"); }
    finally { setSaving(false); }
  }

  const ranges = detail?.test?.referenceRanges || [];
  const template = detail?.resultTemplate;
  const resultObject = result && typeof result === "object" ? result : {};
  const resultValue = typeof result === "object" ? "" : String(result || "");
  const isScan = detail?.test?.type === "scan";
  const editable = detail && !["Completed", "Cancelled", "On Hold", "Awaiting Specimen", "Awaiting Processing", "Assigned"].includes(detail.item.status);

  if (loading) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center text-slate-500">Loading test and order details…</div></main>;
  if (error || !detail) return <main className="min-h-screen bg-slate-50 p-6"><div role="alert" className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-white p-6 text-rose-800">{error || "Worklist item not found"}<div><Link href={`/${labSlug}/${branchSlug}/dashboard/worklists`} className="mt-4 inline-block underline">Back to worklists</Link></div></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href={`/${labSlug}/${branchSlug}/dashboard/worklists`} className="text-sm font-medium text-blue-700">← Back to category worklists</Link>
    <header className="mt-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-teal-700">{detail.item.category} · {detail.item.status}</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{detail.test.name}</h1><p className="mt-1 text-slate-500">Order {detail.order.orderNumber} · Ordered {new Date(detail.order.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{detail.item.priority}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Patient</span><div className="font-semibold">{detail.patient.name || detail.item.patientName}</div><div className="text-sm text-slate-600">{detail.patient.regNumber || detail.item.patientId} · {detail.patient.gender || "Gender not recorded"}</div></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Specimen</span><div className="font-semibold">{detail.specimen?.specimenType || (detail.item.requiresSpecimen ? "Awaiting specimen" : "Not required")}</div><div className="text-sm text-slate-600">{detail.specimen?.accessionNumber || detail.specimen?.sampleId || "—"}</div></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Received and accepted</span><div className="font-semibold">{detail.specimen?.status || "Not applicable"}</div><div className="text-sm text-slate-600">{detail.item.specimenAcceptedAt ? new Date(detail.item.specimenAcceptedAt).toLocaleString() : "—"}</div></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Target completion</span><div className="font-semibold">{detail.item.dueAt ? new Date(detail.item.dueAt).toLocaleString() : "Not configured"}</div><div className="text-sm text-slate-600">Assigned: {detail.item.assignedStaffName || "Unassigned"}</div></div></div>
    </header>
    <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">Result entry</h2><p className="text-sm text-slate-500">Test ID {detail.test.id} · Ordered test ID {detail.item.orderTestId}</p></div><div className="text-right text-sm"><div>Result type: <strong>{detail.test.resultType}</strong></div><div>Unit: <strong>{detail.test.unit || "—"}</strong></div></div></div>
      {ranges.length > 0 && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><h3 className="text-sm font-semibold text-blue-900">Configured reference ranges</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{ranges.map((range: any, index: number) => <div key={index} className="rounded-lg bg-white p-3 text-sm"><strong>{range.label || `${range.gender || "All genders"} · ${range.ageGroup || "All ages"}`}</strong><div>{range.low ?? "—"} – {range.high ?? "—"} {range.unit || detail.test.unit || ""}</div>{(range.criticalLow != null || range.criticalHigh != null) && <div className="text-xs text-rose-700">Critical: {range.criticalLow ?? "—"} – {range.criticalHigh ?? "—"}</div>}</div>)}</div></div>}
      {isScan && template ? <div className="mt-5 space-y-4">{[["findings", "Findings", template.findingsDefaultText], ["impression", "Impression", template.impressionDefaultText], ["conclusion", "Conclusion", template.conclusionDefaultText]].map(([key, label, defaultText]: any) => <label key={key} className="block text-sm font-semibold">{label}<textarea value={resultObject[key] ?? defaultText ?? ""} onChange={e => setResult((current: any) => ({ ...(current && typeof current === "object" ? current : {}), [key]: e.target.value }))} rows={4} disabled={!editable} className="mt-1 w-full rounded-xl border p-3 font-normal disabled:bg-slate-100" /></label>)}{(template.sections || []).map((section: any) => <label key={section.key} className="block text-sm font-semibold">{section.title}{section.required ? " *" : ""}<textarea value={resultObject.sections?.[section.key] ?? section.defaultText ?? ""} onChange={e => setResult((current: any) => ({ ...(current && typeof current === "object" ? current : {}), sections: { ...((current && typeof current === "object" && current.sections) || {}), [section.key]: e.target.value } }))} rows={3} disabled={!editable} className="mt-1 w-full rounded-xl border p-3 font-normal disabled:bg-slate-100" /></label>)}</div> : detail.test.resultType === "numeric" ? <label className="mt-5 block text-sm font-semibold">Result value<input type="number" step="any" value={resultValue} onChange={e => setResult(e.target.value)} disabled={!editable} className="mt-1 block w-full rounded-xl border px-3 py-3 text-lg font-normal disabled:bg-slate-100" /></label> : detail.test.resultType === "text" || isScan ? <label className="mt-5 block text-sm font-semibold">Result<textarea value={resultValue} onChange={e => setResult(e.target.value)} rows={5} disabled={!editable} className="mt-1 block w-full rounded-xl border p-3 font-normal disabled:bg-slate-100" /></label> : <label className="mt-5 block text-sm font-semibold">Result value<input value={resultValue} onChange={e => setResult(e.target.value)} disabled={!editable} className="mt-1 block w-full rounded-xl border px-3 py-3 font-normal disabled:bg-slate-100" placeholder="Enter qualitative or enumerated result" /></label>}
      {!editable && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This item must be started from its category worklist before result entry. Completed tests are read-only.</p>}
      {detail.item.eligibilityReason && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{detail.item.eligibilityReason}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button disabled={!editable || saving} onClick={() => void update("saveResult")} className="rounded-xl border px-4 py-2.5 font-semibold disabled:opacity-50">{saving ? "Saving…" : saved || detail.item.resultUpdatedAt ? "Save result" : "Save result"}</button><button disabled={!editable || saving || !(saved || detail.item.resultUpdatedAt)} onClick={() => void update("complete")} className="rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">Complete test processing</button></div>
      <p className="mt-4 text-xs text-slate-500">Completing test processing records the result-entry step only. Final report review, approval, and release remain separate.</p>
    </section>
  </div></main>;
}
