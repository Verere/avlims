"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Payment {
  _id: string;
  amount: number;
 name?: string;
  userId?: string;
  branch?: string;
  branchId?: string;
  patient?: string;
  user?: string;
  slug?: string;
  orderId?: string;
  businessDate?: string;
  status?: string;
  createdAt?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payments");
        if (!res.ok) throw new Error("Failed to fetch payments");
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : [data]);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  // Calculate totals
  let totalPayment = 0;
  let totalCash = 0;
  let totalPos = 0;
  let totalTransfer = 0;
  for (const payment of payments) {
    if (Array.isArray((payment as any).payments)) {
      for (const p of (payment as any).payments) {
        totalPayment += p.amount || 0;
        if (p.method === 'cash') totalCash += p.amount || 0;
        if (p.method === 'pos') totalPos += p.amount || 0;
        if (p.method === 'transfer') totalTransfer += p.amount || 0;
      }
    }
  }

  return (
    <>
    <Navbar/>
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-900 mb-0">Payments</h1>
        {!loading && !error && (
          <div className="flex flex-wrap gap-2 md:gap-4">
            <div className="bg-blue-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Payment</div>
              <div className="text-base font-bold text-blue-900">₦{totalPayment.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Cash</div>
              <div className="text-base font-bold text-green-700">₦{totalCash.toLocaleString()}</div>
            </div>
            <div className="bg-yellow-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total POS</div>
              <div className="text-base font-bold text-yellow-700">₦{totalPos.toLocaleString()}</div>
            </div>
            <div className="bg-purple-50 rounded px-3 py-2 text-center">
              <div className="text-xs text-gray-500">Total Transfer</div>
              <div className="text-base font-bold text-purple-700">₦{totalTransfer.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto rounded shadow bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Order ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Payments</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">User</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment, idx) => {
                let date = "-";
                let time = "-";
                if (payment.businessDate) {
                  const d = new Date(payment.businessDate);
                  if (!isNaN(d.getTime())) {
                    date = d.toLocaleDateString();
                    time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  }
                }
                // Render payments as a comma-separated list of method: amount
                let paymentsDisplay = "-";
                if (Array.isArray((payment as any).payments) && (payment as any).payments.length > 0) {
                  paymentsDisplay = (payment as any).payments.map((p: any) => `${p.method}: ₦${p.amount?.toLocaleString()}`).join(", ");
                }
                return (
                  <tr key={payment._id} className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100`}>
                    <td className="px-4 py-2 text-sm font-mono">{payment.orderId || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{payment.name || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{paymentsDisplay}</td>
                    <td className="px-4 py-2 text-sm">{payment.user || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2 text-sm">{date}</td>
                    <td className="px-4 py-2 text-sm">{time}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">No payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
                  </>
  );
}
