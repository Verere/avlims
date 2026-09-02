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
				}

				return acc;
			},
			{ total: 0, cash: 0, pos: 0, transfer: 0 }
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

					<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
					</div>
				</div>

				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
								<tr>
									<th className="px-4 py-3 text-left">Order ID</th>
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
										<td colSpan={7} className="px-4 py-10 text-center text-slate-500">
											Loading payments...
										</td>
									</tr>
								) : error ? (
									<tr>
										<td colSpan={7} className="px-4 py-10 text-center text-red-600">
											{error}
										</td>
									</tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-10 text-center text-slate-500">
											No payments found for the selected date.
										</td>
									</tr>
								) : (
									rows.map((row, idx) => {
										const paymentsDisplay = Array.isArray(row.payments) && row.payments.length > 0
											? row.payments.map((entry) => `${String(entry.method || "-").toUpperCase()}: ${formatCurrency(Number(entry.amount || 0))}`).join(", ")
											: "-";

										return (
											<tr key={row._id || `${row.orderId || "row"}-${idx}`} className="hover:bg-slate-50">
												<td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{row.orderId || "-"}</td>
												<td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{row.transactionId || "-"}</td>
												<td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.name || "-"}</td>
												<td className="px-4 py-3 text-slate-700">{paymentsDisplay}</td>
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
