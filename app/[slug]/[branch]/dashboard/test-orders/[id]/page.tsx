"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TestItem = {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  panel?: {
    id: string;
    name: string;
    price: number;
  };
};

type TestOrder = {
  _id: string;
  patientId?: string;
  name?: string;
  amount?: number;
  amountPaid?: number;
  bal?: number;
  status?: string;
  createdAt?: string;
  bDate?: string;
  tests?: TestItem[];
  referral?: string;
  referralId?: string;
  discount?: number;
  bonus?: number;
  user?: string;
  clinic?: string;
  billToName?: string;
  isCancelled?: boolean;
};

type ReferrerOption = {
  _id: string;
  name: string;
};

export default function DashboardTestOrderDetailsPage() {
  const pathname = usePathname();
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  const [selectedReferrerId, setSelectedReferrerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingReferrer, setUpdatingReferrer] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";
  const orderId = pathParts[pathParts.length - 1] || "";

  const formatCurrency = (value?: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          throw new Error("Failed to fetch branch");
        }
        const branchDoc = await branchRes.json();
        const branchId = String(branchDoc?._id || "");

        const [orderRes, refRes] = await Promise.all([
          fetch(`/api/test-orders/${encodeURIComponent(orderId)}`),
          fetch(`/api/referrers?branchId=${encodeURIComponent(branchId)}`),
        ]);

        if (!orderRes.ok) {
          throw new Error("Failed to fetch order details");
        }

        const orderData = await orderRes.json();
        const refsData = refRes.ok ? await refRes.json() : [];

        setOrder(orderData);
        setReferrers(Array.isArray(refsData) ? refsData : []);

        const currentRefId = String(orderData?.referralId || "");
        if (currentRefId) {
          setSelectedReferrerId(currentRefId);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    }

    if (branch && orderId) {
      fetchData();
    }
  }, [branch, orderId]);

  const testsSummary = useMemo(() => {
    if (!order?.tests || order.tests.length === 0) return [] as string[];

    return order.tests.map((item) => {
      const qty = Number(item.quantity || 1);
      const base = `${item.name} x${qty}`;
      if (item.panel?.name) {
        return `${base} (${item.panel.name})`;
      }
      return base;
    });
  }, [order]);

  const canUpdateReferrer =
    !!order &&
    !order.isCancelled &&
    selectedReferrerId.trim().length > 0 &&
    selectedReferrerId !== String(order.referralId || "");

  const handleUpdateReferrer = async () => {
    if (!order || !selectedReferrerId) return;

    setBanner(null);
    setUpdatingReferrer(true);
    try {
      const selectedRef = referrers.find((r) => r._id === selectedReferrerId);
      const res = await fetch(`/api/test-orders/${encodeURIComponent(order._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId: selectedReferrerId,
          referral: selectedRef?.name || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to update referrer");
      }

      setOrder(data.order);
      setBanner({ type: "success", text: "Referrer updated successfully." });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to update referrer." });
    } finally {
      setUpdatingReferrer(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || order.isCancelled) return;

    const confirmed = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmed) return;

    setBanner(null);
    setCancellingOrder(true);
    try {
      const res = await fetch(`/api/test-orders/${encodeURIComponent(order._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelOrder: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to cancel order");
      }

      setOrder(data.order);
      setBanner({ type: "success", text: "Order cancelled successfully." });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to cancel order." });
    } finally {
      setCancellingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_55%,_#e2e8f0)] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading order details...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2,_#fff_55%,_#fef2f2)] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Unable to load order details</p>
          <p className="mt-1 text-sm text-red-600">{error || "Order not found."}</p>
          <Link
            href={`/${slug}/${branch}/dashboard/test-orders`}
            className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const orderDate = order.bDate || order.createdAt;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_45%,#fefce8_100%)] px-3 py-6 sm:px-4 md:px-6 md:py-8">
      <section className="mx-auto w-full max-w-5xl space-y-4 md:space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Details</p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl md:text-3xl">{order.name || "Test Order"}</h1>
              <p className="mt-1 text-sm text-slate-600">Order ID: {order._id}</p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                order.isCancelled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {order.isCancelled ? "Cancelled" : order.status || "Active"}
            </span>
          </div>

          {banner ? (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                banner.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {banner.text}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(orderDate)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Booked By</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.user || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Clinic</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.clinic || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Referrer</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.referral || "-"}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                Tests Requested
              </div>
              <div className="space-y-2 p-3">
                {testsSummary.length === 0 ? (
                  <p className="text-sm text-slate-500">No tests captured for this order.</p>
                ) : (
                  testsSummary.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold text-slate-900">Financials</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs uppercase tracking-wide text-blue-600">Amount</p>
                <p className="mt-1 text-lg font-black text-blue-900">{formatCurrency(order.amount)}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-600">Paid</p>
                <p className="mt-1 text-lg font-black text-emerald-900">{formatCurrency(order.amountPaid)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-600">Balance</p>
                <p className="mt-1 text-lg font-black text-amber-900">{formatCurrency(order.bal)}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3">
                <p className="text-xs uppercase tracking-wide text-fuchsia-700">Discount</p>
                <p className="mt-1 text-lg font-black text-fuchsia-900">{formatCurrency(order.discount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-bold text-slate-900">Actions</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Update Referrer</p>
              <p className="mt-1 text-xs text-slate-600">Choose another referrer and apply the update.</p>

              <select
                value={selectedReferrerId}
                onChange={(e) => setSelectedReferrerId(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
                disabled={order.isCancelled}
              >
                <option value="">Select referrer</option>
                {referrers.map((ref) => (
                  <option key={ref._id} value={ref._id}>
                    {ref.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleUpdateReferrer}
                disabled={!canUpdateReferrer || updatingReferrer}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {updatingReferrer ? "Updating..." : "Update Referrer"}
              </button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Cancel Order</p>
              <p className="mt-1 text-xs text-red-700">This will mark the order as cancelled.</p>

              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={order.isCancelled || cancellingOrder}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {order.isCancelled ? "Already Cancelled" : cancellingOrder ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <Link
              href={`/${slug}/${branch}/dashboard/test-orders`}
              className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Test Orders
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
