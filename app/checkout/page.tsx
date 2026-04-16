"use client";
import { useState, useMemo } from "react";


import { useEffect } from "react";

type Charge = {
  id: string;
  patient: string;
  referral: string;
  amount: number;
  paid: number;
};

export default function CheckoutPage() {

  const [charges, setCharges] = useState<Charge[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Charge[]>>({});
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCharges() {
      setLoading(true);
      try {
        const res = await fetch("/api/charges");
        const data = await res.json();
        // Flatten all charges for summary
        let allCharges: Charge[] = [];
        if (data.grouped) {
          allCharges = data.grouped.flatMap((g: any) => g.charges.map((c: any) => ({
            id: c._id?.toString() || c.id,
            patient: c.patient,
            referral: c.referral,
            amount: c.amount,
            paid: c.paid,
          })));
        }
        setCharges(allCharges);
        // Group by patient
        const map: Record<string, Charge[]> = {};
        for (const c of allCharges) {
          if (!map[c.patient]) map[c.patient] = [];
          map[c.patient].push(c);
        }
        setGrouped(map);
        setTotal(data.total || 0);
        setPaid(data.paid || 0);
        setOutstanding(data.outstanding || 0);
      } catch (e) {
        setError("Failed to load charges");
      } finally {
        setLoading(false);
      }
    }
    fetchCharges();
  }, []);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      // TODO: Call payment API
      await new Promise(res => setTimeout(res, 1200));
      setSuccess(true);
    } catch (e: any) {
      setError("Payment failed");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  // Mobile: stacked cards, sticky button. Desktop: two-column layout.
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row md:items-start md:gap-8 md:p-8">
      {/* Left: Charges */}
      <div className="flex-1 w-full max-w-lg mx-auto md:mx-0 md:w-1/2">
        <h1 className="text-xl font-bold mb-4">Checkout</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          Object.entries(grouped).map(([patient, items]) => (
            <div key={patient} className="bg-white rounded-lg shadow mb-4 p-4">
              <div className="font-semibold text-lg mb-2">{patient}</div>
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <div className="text-base">{item.referral}</div>
                    <div className="text-xs text-gray-500">Charge ID: {item.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${item.amount}</div>
                    <div className={item.paid ? "text-green-700" : "text-red-600"}>
                      {item.paid ? `Paid: $${item.paid}` : "Unpaid"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      {/* Right: Summary */}
      <div className="w-full md:w-1/3 md:sticky md:top-8">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between text-lg font-semibold mb-2">
            <span>Total</span>
            <span>${total}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Paid</span>
            <span className="text-green-700 font-bold">${paid}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Outstanding</span>
            <span className="text-red-600 font-bold">${outstanding}</span>
          </div>
        </div>
        {/* Success state */}
        {success && (
          <div className="bg-green-100 text-green-800 rounded p-4 text-center font-semibold mb-4">
            Payment successful!
          </div>
        )}
        {/* Error state */}
        {error && (
          <div className="bg-red-100 text-red-800 rounded p-4 text-center font-semibold mb-4">
            {error}
          </div>
        )}
        {/* Confirm button (sticky on mobile) */}
        {!success && (
          <div className="fixed bottom-0 left-0 w-full md:static md:w-auto bg-white border-t md:border-none shadow-lg md:shadow-none z-50 p-4 md:p-0">
            <button
              className="w-full bg-blue-700 text-white rounded px-4 py-3 text-lg font-bold shadow disabled:opacity-50"
              style={{ minHeight: 56 }}
              disabled={submitting || outstanding === 0}
              onClick={() => setShowConfirm(true)}
            >
              {submitting ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        )}
        {/* Confirmation dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <div className="text-lg font-semibold mb-4">Confirm Payment</div>
              <div className="mb-4">Are you sure you want to finalize this payment?</div>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-700 text-white rounded px-4 py-2 font-bold"
                  style={{ minHeight: 44 }}
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  Yes, Confirm
                </button>
                <button
                  className="flex-1 bg-gray-200 text-gray-800 rounded px-4 py-2 font-bold"
                  style={{ minHeight: 44 }}
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
