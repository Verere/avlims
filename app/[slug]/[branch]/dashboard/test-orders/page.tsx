"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface TestOrder {
  _id: string;
  transId?: string;
  patientId: string;
  name: string;
  amount: number;
  bal:number;
  status: string;
  isCancelled?: boolean;
  createdAt: string;
  referralId?: string;
  tests?: {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    panel?: {
      id: string;
      name: string;
      price: number;
    };
  }[];
  referral?: string;
  discount?: number;
  bDate?: string;
  bonus?: number;
  user?: string;
}

interface ReferrerOption {
  id: string;
  name: string;
}

export default function DashboardTestOrdersPage() {
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrersError, setReferrersError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedReferrerId, setSelectedReferrerId] = useState("");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referrerDropdownOpen, setReferrerDropdownOpen] = useState(false);
  const [activeReferrerIndex, setActiveReferrerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const pathname = usePathname();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getBusinessDate = (value?: string) => {
    if (!value) return "";
    const datePrefix = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePrefix) ? datePrefix : "";
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      setReferrersError(null);
      try {
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1];

        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) throw new Error("Failed to fetch branch info");
        const branchDoc = await branchRes.json();
        const branchId = branchDoc._id;

        const [ordersRes, referrersResult] = await Promise.all([
          fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}`),
          fetch(`/api/referrers?branchId=${encodeURIComponent(branchId)}`)
            .then(async (response) => {
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || "Failed to fetch referrers");
              }
              return { data: await response.json(), error: null };
            })
            .catch((fetchError: unknown) => ({
              data: [],
              error: fetchError instanceof Error ? fetchError.message : "Failed to fetch referrers",
            })),
        ]);
        if (!ordersRes.ok) throw new Error("Failed to fetch test orders");
        const data = await ordersRes.json();
        const normalized = Array.isArray(data) ? data : [data];
        setOrders(normalized.filter((order: TestOrder) => order?.isCancelled !== true));
        setReferrersError(referrersResult.error);
        setReferrers(Array.isArray(referrersResult.data)
          ? referrersResult.data
              .map((referrer: { _id?: string; id?: string; name?: string }) => ({
                id: String(referrer._id || referrer.id || ""),
                name: String(referrer.name || ""),
              }))
              .filter((referrer: ReferrerOption) => referrer.id && referrer.name)
          : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (pathname) fetchOrders();
  }, [pathname]);

  const filteredOrders = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const orderDate = getBusinessDate(order.bDate || order.createdAt);
      if (!fromDate || !toDate || fromDate > toDate || orderDate < fromDate || orderDate > toDate) return false;
      if (selectedReferrerId) {
        const selectedReferrer = referrers.find((referrer) => referrer.id === selectedReferrerId);
        const matchesReferrer = order.referralId
          ? order.referralId === selectedReferrerId
          : Boolean(selectedReferrer && order.referral?.trim().toLocaleLowerCase() === selectedReferrer.name.toLocaleLowerCase());
        if (!matchesReferrer) return false;
      }
      if (!normalizedSearchQuery) return true;

      const testNames = order.tests?.flatMap((test) => [test.name, test.panel?.name]) || [];
      return [
        order.transId,
        order.name,
        order.patientId,
        order.referral,
        order.user,
        order.status,
        order.amount,
        order.discount,
        ...testNames,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
    });
  }, [orders, searchQuery, fromDate, toDate, selectedReferrerId, referrers]);

  const matchingReferrers = useMemo(() => {
    const query = referrerSearch.trim().toLocaleLowerCase();
    return query
      ? referrers.filter((referrer) => referrer.name.toLocaleLowerCase().includes(query))
      : referrers;
  }, [referrers, referrerSearch]);
  const selectedReferrer = referrers.find((referrer) => referrer.id === selectedReferrerId);

  const selectReferrer = (referrer: ReferrerOption | null) => {
    setSelectedReferrerId(referrer?.id || "");
    setReferrerSearch("");
    setReferrerDropdownOpen(false);
    setActiveReferrerIndex(0);
  };

  const totals = useMemo(() => {
    const patients = new Set<string>();
    return filteredOrders.reduce(
      (acc, order) => {
        acc.amount += Number(order.amount || 0);
        acc.discount += Number(order.discount || 0);
        acc.testEntries += (order.tests || []).reduce((testCount, test) => {
          const quantity = Number(test.quantity);
          return testCount + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
        }, 0);
        const patientKey = String(order.patientId || order.name || "").trim().toLocaleLowerCase();
        if (patientKey) patients.add(patientKey);
        acc.patientCount = patients.size;
        return acc;
      },
      { amount: 0, discount: 0, testEntries: 0, patientCount: 0 }
    );
  }, [filteredOrders]);

  const renderTestsCell = (tests?: TestOrder["tests"]) => {
    if (!tests || tests.length === 0) return <span>-</span>;

    const panelGroups = new Map<string, { name: string; price: number; tests: string[] }>();
    const standalone: string[] = [];

    for (const test of tests) {
      if (test.panel?.id) {
        const existing = panelGroups.get(test.panel.id);
        if (existing) {
          existing.tests.push(test.name);
        } else {
          panelGroups.set(test.panel.id, {
            name: test.panel.name,
            price: Number(test.panel.price || 0),
            tests: [test.name],
          });
        }
      } else {
        standalone.push(test.name);
      }
    }

    return (
      <div className="space-y-1">
        {Array.from(panelGroups.entries()).map(([panelId, group]) => (
          <div key={panelId} className="rounded bg-slate-50 px-2 py-1">
            <div className="text-xs font-semibold text-blue-700">
              {group.name} - ₦{group.price.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">{group.tests.join(", ")}</div>
          </div>
        ))}
        {standalone.map((name, idx) => (
          <div key={`${name}-${idx}`} className="text-xs text-slate-700">
            {name}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Orders</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Test Orders</h1>
              <p className="mt-1 text-sm text-slate-600">View branch test orders by business date and referrer.</p>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700 xl:col-span-2">
                Search
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Patient, test, or ID"
                  aria-label="Search test orders"
                  className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </label>
              <label className="flex min-w-0 flex-col text-sm font-medium text-slate-700">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
              </label>
              <div
                className="relative flex min-w-0 flex-col text-sm font-medium text-slate-700"
                onBlur={(event) => {
                  if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                    setReferrerDropdownOpen(false);
                    setReferrerSearch("");
                  }
                }}
              >
                Referrer
                <input
                  type="text"
                  role="combobox"
                  aria-label="Search and select referrer"
                  aria-autocomplete="list"
                  aria-expanded={referrerDropdownOpen}
                  aria-controls="referrer-options"
                  aria-activedescendant={referrerDropdownOpen
                    ? activeReferrerIndex === 0
                      ? "referrer-option-all"
                      : matchingReferrers[activeReferrerIndex - 1]
                        ? `referrer-option-${matchingReferrers[activeReferrerIndex - 1].id}`
                        : undefined
                    : undefined}
                  value={referrerDropdownOpen ? referrerSearch : selectedReferrer?.name || ""}
                  placeholder="All referrers"
                  onFocus={() => {
                    setReferrerSearch("");
                    setReferrerDropdownOpen(true);
                    setActiveReferrerIndex(0);
                  }}
                  onChange={(event) => {
                    setReferrerSearch(event.target.value);
                    setReferrerDropdownOpen(true);
                    setActiveReferrerIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setReferrerDropdownOpen(true);
                      setActiveReferrerIndex((index) => Math.min(index + 1, matchingReferrers.length));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveReferrerIndex((index) => Math.max(index - 1, 0));
                    } else if (event.key === "Enter" && referrerDropdownOpen) {
                      event.preventDefault();
                      if (activeReferrerIndex === 0) selectReferrer(null);
                      else if (matchingReferrers[activeReferrerIndex - 1]) {
                        selectReferrer(matchingReferrers[activeReferrerIndex - 1]);
                      }
                    } else if (event.key === "Escape") {
                      setReferrerDropdownOpen(false);
                      setReferrerSearch("");
                    }
                  }}
                  className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                />
                {referrerDropdownOpen ? (
                  <div
                    id="referrer-options"
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <button
                      id="referrer-option-all"
                      type="button"
                      role="option"
                      aria-selected={!selectedReferrerId}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectReferrer(null)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${activeReferrerIndex === 0 ? "bg-blue-50 text-blue-800" : "text-slate-700"}`}
                    >
                      All referrers
                    </button>
                    {matchingReferrers.map((referrer, index) => (
                      <button
                        id={`referrer-option-${referrer.id}`}
                        key={referrer.id}
                        type="button"
                        role="option"
                        aria-selected={referrer.id === selectedReferrerId}
                        onMouseEnter={() => setActiveReferrerIndex(index + 1)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectReferrer(referrer)}
                        className={`w-full truncate px-3 py-2 text-left text-sm hover:bg-blue-50 ${activeReferrerIndex === index + 1 ? "bg-blue-50 text-blue-800" : "text-slate-700"}`}
                      >
                        {referrer.name}
                      </button>
                    ))}
                    {matchingReferrers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">No referrers match your search.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setFromDate(today);
                  setToDate(today);
                }}
                className="h-10 w-full self-end rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:col-span-2 lg:col-span-1"
              >
                Today
              </button>
            </div>
          </div>
          {referrersError ? (
            <p className="mt-3 text-sm text-amber-700" role="status">
              Referrer filter unavailable: {referrersError}. Orders are still shown without that filter.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Amount</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(totals.amount)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Discount</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(totals.discount)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Test Entries</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{totals.testEntries}</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Number of Patients</p>
              <p className="mt-1 text-lg font-bold text-violet-900">{totals.patientCount}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Transaction ID</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Tests</th>
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                      Loading test orders...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                      No matching test orders found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const orderDate = order.bDate || order.createdAt;
                    return (
                      <tr key={order._id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(orderDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTime(orderDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{order.transId || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{order.name || "-"}</td>
                        <td className="max-w-xs px-4 py-3 text-slate-700">{renderTestsCell(order.tests)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{order.referral || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{order.user || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(Number(order.amount || 0))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">
                          {formatCurrency(Number(order.discount || 0))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">
                          {formatCurrency(Number(order.bal || 0))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <Link href={`./${order._id}`} className="font-medium text-blue-700 hover:underline">
                            View
                          </Link>
                        </td>
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
