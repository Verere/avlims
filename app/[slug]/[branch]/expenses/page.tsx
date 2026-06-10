"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

type ExpenseRow = {
  _id: string;
  amount: number;
  description: string;
  category?: string;
  businessDate?: string;
  user?: string;
  note?: string;
};

async function fetchBranchBySlug(branchSlug: string) {
  const res = await fetch(`/api/branches/${branchSlug}`);
  if (!res.ok) throw new Error("Branch not found");
  return res.json();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

export default function ExpensesPage() {
  const pathname = usePathname();
  const parts = (pathname || "").split("/").filter(Boolean);
  const branchSlug = parts[1] || "";

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("");
  const [labId, setLabId] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    description: "",
    category: "general",
    businessDate: new Date().toISOString().slice(0, 10),
    user: "",
    note: "",
  });
  const [saving, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const loadExpenses = async (resolvedBranchId: string, resolvedLabId: string, dateYmd: string) => {
    const query = new URLSearchParams({ branchId: resolvedBranchId, labId: resolvedLabId, date: dateYmd }).toString();
    const res = await fetch(`/api/expenses?${query}`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to fetch expenses" }));
      throw new Error(payload.error || "Failed to fetch expenses");
    }
    const payload = await res.json();
    return Array.isArray(payload?.expenses) ? payload.expenses : [];
  };

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!branchSlug) {
        setError("Missing branch in URL");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const branchDoc = await fetchBranchBySlug(branchSlug);
        if (!mounted) return;

        const resolvedBranchId = String(branchDoc._id || "");
        const resolvedLabId = String(branchDoc.lab || branchDoc._id || "");
        setBranchId(resolvedBranchId);
        setLabId(resolvedLabId);

        const list = await loadExpenses(resolvedBranchId, resolvedLabId, selectedDate);
        if (!mounted) return;
        setExpenses(list);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to fetch expenses");
        setExpenses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [branchSlug, selectedDate]);

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, row) => {
        acc.amount += Number(row.amount || 0);
        acc.count += 1;
        return acc;
      },
      { amount: 0, count: 0 }
    );
  }, [expenses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    if (!branchId || !labId) {
      setFormError("Branch context not resolved");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Enter a valid amount");
      return;
    }

    if (!form.description.trim()) {
      setFormError("Description is required");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          labId,
          branchId,
          amount,
          description: form.description,
          category: form.category,
          businessDate: new Date(`${form.businessDate}T00:00:00.000Z`).toISOString(),
          user: form.user || undefined,
          note: form.note || undefined,
        };

        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to save expense" }));
          throw new Error(body.error || "Failed to save expense");
        }

        const list = await loadExpenses(branchId, labId, selectedDate);
        setExpenses(list);
        setForm({
          amount: "",
          description: "",
          category: "general",
          businessDate: new Date().toISOString().slice(0, 10),
          user: "",
          note: "",
        });
        setSuccess("Expense recorded successfully.");
      } catch (err: any) {
        setFormError(err?.message || "Failed to save expense");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <Navbar />
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Finance</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Expenses</h1>
              <p className="mt-1 text-sm text-slate-600">Record and review branch expenses by date.</p>
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Total Expenses</p>
              <p className="mt-1 text-lg font-bold text-orange-900">{formatCurrency(totals.amount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Entries</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{totals.count}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add Expense</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
              >
                <option value="general">General</option>
                <option value="utilities">Utilities</option>
                <option value="supplies">Supplies</option>
                <option value="staff">Staff</option>
                <option value="logistics">Logistics</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                placeholder="e.g. Generator fuel refill"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Business Date</label>
              <input
                type="date"
                name="businessDate"
                value={form.businessDate}
                onChange={handleChange}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Recorded By</label>
              <input
                type="text"
                name="user"
                value={form.user}
                onChange={handleChange}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                placeholder="Optional"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Note</label>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows={3}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
                placeholder="Optional note"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Expense"}
            </button>

            {formError ? <div className="sm:col-span-2 rounded bg-red-50 p-2 text-sm text-red-700">{formError}</div> : null}
            {success ? <div className="sm:col-span-2 rounded bg-green-50 p-2 text-sm text-green-700">{success}</div> : null}
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading expenses...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-red-600">{error}</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No expenses found for selected date.</td>
                  </tr>
                ) : (
                  expenses.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(row.businessDate)}</td>
                      <td className="px-4 py-3 text-slate-900">
                        <div className="font-medium">{row.description}</div>
                        {row.note ? <div className="text-xs text-slate-500">{row.note}</div> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.category || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.user || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
