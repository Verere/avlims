"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type PaymentEntry = {
	method?: string;
	amount?: number;
};

type PaymentRow = {
	_id: string;
	orderId?: string;
	transactionId?: string;
	name?: string;
	user?: string;
	branchId?: string;
	businessDate?: string;
	payments?: PaymentEntry[];
};

const paymentMethods = ["cash", "pos", "transfer", "other"] as const;

function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		maximumFractionDigits: 2,
	}).format(value || 0);
}

function formatDate(value?: string) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatTime(value?: string) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

async function fetchBranchBySlug(branchSlug: string) {
	const res = await fetch(`/api/branches/${branchSlug}`);
	if (!res.ok) throw new Error("Branch not found");
	return res.json();
}

async function fetchPayments() {
	const res = await fetch("/api/payments?isCancelled=false");
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Failed to fetch payments" }));
		throw new Error(err.error || "Failed to fetch payments");
	}
	return res.json();
}

export default function DashboardPaymentsPage() {
	const pathname = usePathname();
	const pathParts = (pathname || "").split("/").filter(Boolean);
	const branchSlug = pathParts[1] || "";

	const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [rows, setRows] = useState<PaymentRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");
	const [editingEntry, setEditingEntry] = useState<{ paymentId: string; entryIndex: number; method: string } | null>(null);
	const [savingEntry, setSavingEntry] = useState(false);
	const [editError, setEditError] = useState("");

	const savePaymentMethod = async () => {
		if (!editingEntry) return;
		const row = rows.find((item) => item._id === editingEntry.paymentId);
		if (!row?.branchId) {
			setEditError("Could not identify the branch for this payment.");
			return;
		}
		setSavingEntry(true);
		setEditError("");
		try {
			const res = await fetch("/api/payments", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					paymentId: editingEntry.paymentId,
					branchId: row.branchId,
					entryIndex: editingEntry.entryIndex,
					method: editingEntry.method,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || "Failed to update payment method");
			setRows((current) => current.map((item) => item._id === data._id ? data : item));
			setEditingEntry(null);
		} catch (e: any) {
			setEditError(e?.message || "Failed to update payment method");
		} finally {
			setSavingEntry(false);
		}
	};

	useEffect(() => {
		let isMounted = true;

		async function run() {
			if (!branchSlug) {
				setError("Missing branch in URL");
				setRows([]);
				setLoading(false);
				return;
			}

			setLoading(true);
			setError("");
			try {
				const [branchDoc, paymentsData] = await Promise.all([fetchBranchBySlug(branchSlug), fetchPayments()]);

				const scopedRows = Array.isArray(paymentsData)
					? paymentsData.filter((row: PaymentRow) => {
							const sameBranch = String(row.branchId || "") === String(branchDoc._id);
							if (!sameBranch) return false;

							const dateValue = row.businessDate;
							if (!dateValue) return false;

							const rowDate = new Date(dateValue);
							if (Number.isNaN(rowDate.getTime())) return false;

							return rowDate.toISOString().slice(0, 10) === selectedDate;
						})
					: [];

				if (!isMounted) return;
				setRows(scopedRows);
			} catch (e: any) {
				if (!isMounted) return;
				setError(e?.message || "Failed to fetch payments");
				setRows([]);
			} finally {
				if (isMounted) setLoading(false);
			}
		}

		run();

		return () => {
			isMounted = false;
		};
	}, [branchSlug, selectedDate]);

	const totals = useMemo(() => {
		return rows.reduce(
			(acc, row) => {
				if (!Array.isArray(row.payments)) return acc;

				for (const payment of row.payments) {
					const amount = Number(payment?.amount || 0);
					const method = String(payment?.method || "").toLowerCase();

					acc.total += amount;
					if (method === "cash") acc.cash += amount;
					if (method === "pos") acc.pos += amount;
					if (method === "transfer") acc.transfer += amount;
					if (method === "other") acc.other += amount;
				}

				return acc;
			},
			{ total: 0, cash: 0, pos: 0, transfer: 0, other: 0 }
		);
	}, [rows]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
			<section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
				<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payments</p>
							<h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Branch Payments</h1>
							<p className="mt-1 text-sm text-slate-600">Daily payments breakdown for this branch.</p>
						</div>

						<div className="flex items-end gap-2">
							<label className="flex flex-col text-sm font-medium text-slate-700">
								Date
								<input
									type="date"
									value={selectedDate}
									onChange={(e) => setSelectedDate(e.target.value)}
									className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
								/>
							</label>
							<button
								type="button"
								onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
								className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								Today
							</button>
						</div>
					</div>

					<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
						<div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Payment</p>
							<p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.total)}</p>
						</div>
						<div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cash</p>
							<p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(totals.cash)}</p>
						</div>
						<div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-amber-700">POS</p>
							<p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(totals.pos)}</p>
						</div>
						<div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Transfer</p>
							<p className="mt-1 text-lg font-bold text-indigo-900">{formatCurrency(totals.transfer)}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Other</p>
							<p className="mt-1 text-lg font-bold text-slate-800">{formatCurrency(totals.other)}</p>
						</div>
					</div>
				</div>

				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
								<tr>
									<th className="px-4 py-3 text-left">Transaction ID</th>
									<th className="px-4 py-3 text-left">Patient</th>
									<th className="px-4 py-3 text-left">Payments</th>
									<th className="px-4 py-3 text-left">User</th>
									<th className="px-4 py-3 text-left">Date</th>
									<th className="px-4 py-3 text-left">Time</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-slate-500">
											Loading payments...
										</td>
									</tr>
								) : error ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-red-600">
											{error}
										</td>
									</tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-slate-500">
											No payments found for the selected date.
										</td>
									</tr>
								) : (
									rows.map((row, idx) => {
										const paymentEntries = Array.isArray(row.payments) ? row.payments : [];

										return (
											<tr key={row._id || `${row.orderId || "row"}-${idx}`} className="hover:bg-slate-50">
												<td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{row.transactionId || "-"}</td>
												<td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.name || "-"}</td>
												<td className="px-4 py-3 text-slate-700">
													{paymentEntries.length ? <div className="space-y-2">{paymentEntries.map((entry, entryIndex) => {
														const isEditing = editingEntry?.paymentId === row._id && editingEntry.entryIndex === entryIndex;
														return <div key={`${row._id}-${entryIndex}`} className="flex flex-wrap items-center gap-2">
															{isEditing ? <>
															<select value={editingEntry.method} onChange={(event) => setEditingEntry((current) => current ? { ...current, method: event.target.value } : current)} disabled={savingEntry} aria-label="Payment method" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
																{paymentMethods.map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
															</select>
																<span>{formatCurrency(Number(entry.amount || 0))}</span>
																<button type="button" onClick={savePaymentMethod} disabled={savingEntry} className="text-xs font-semibold text-blue-700 disabled:opacity-50">{savingEntry ? "Saving…" : "Save"}</button>
																<button type="button" onClick={() => { setEditingEntry(null); setEditError(""); }} disabled={savingEntry} className="text-xs text-slate-500">Cancel</button>
															</> : <>
																<span>{String(entry.method || "-").toUpperCase()}: {formatCurrency(Number(entry.amount || 0))}</span>
																<button type="button" onClick={() => { setEditingEntry({ paymentId: row._id, entryIndex, method: String(entry.method || "cash").toLowerCase() }); setEditError(""); }} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Edit</button>
															</>}
														</div>;
													})}</div> : "-"}
													{editError && editingEntry?.paymentId === row._id ? <p className="mt-1 text-xs text-red-600">{editError}</p> : null}
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.user || "-"}</td>
												<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(row.businessDate)}</td>
												<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTime(row.businessDate)}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</div>
	);
}
