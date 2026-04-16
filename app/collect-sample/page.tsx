"use client";
import { useState, useRef } from "react";

// Dummy function for barcode scanning (replace with real scanner/camera integration)
function useBarcodeScanner(onScan: (code: string) => void) {
  // In production, integrate with a camera or hardware scanner
  return {
    start: () => alert("Camera scanning not implemented in this demo."),
  };
}

export default function CollectSamplePage() {
  const [barcode, setBarcode] = useState("");
  const [collected, setCollected] = useState(false);
  const [warning, setWarning] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanner = useBarcodeScanner(code => setBarcode(code));

  // Listen for offline/online
  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => setOffline(true));
    window.addEventListener("online", () => setOffline(false));
  }

  async function handleConfirm() {
    setLoading(true);
    setWarning("");
    try {
      const res = await fetch("/api/collect-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data = await res.json();
      if (res.status === 404) {
        setWarning("Sample not found!");
        setCollected(false);
      } else if (data.warning) {
        setWarning(data.warning);
        setCollected(false);
      } else if (data.success) {
        setCollected(true);
        setWarning("");
      } else {
        setWarning("Unknown error");
        setCollected(false);
      }
    } catch (e) {
      setWarning("Network or server error");
      setCollected(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold mb-2 text-center">Sample Collection</h1>
        <label className="block text-lg font-medium mb-1">Scan or Enter Barcode</label>
        <div className="flex gap-2 mb-2">
          <input
            ref={inputRef}
            className="flex-1 border rounded px-3 py-3 text-lg"
            placeholder="Sample barcode"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            disabled={collected || loading}
            inputMode="text"
            autoFocus
            style={{ minHeight: 44 }}
          />
          <button
            className="bg-blue-700 text-white rounded px-3 py-2 font-bold min-h-[44px]"
            onClick={() => scanner.start()}
            disabled={collected || loading}
            aria-label="Scan barcode with camera"
          >
            <span role="img" aria-label="Camera">📷</span>
          </button>
        </div>
        {warning && (
          <div className="bg-yellow-100 text-yellow-800 rounded p-2 text-center font-semibold">
            {warning}
          </div>
        )}
        {collected && !warning && (
          <div className="bg-green-100 text-green-800 rounded p-2 text-center font-semibold">
            Sample collected!
          </div>
        )}
        {offline && (
          <div className="bg-orange-100 text-orange-800 rounded p-2 text-center font-semibold">
            Offline mode: actions will sync when online.
          </div>
        )}
        <button
          className="w-full bg-blue-700 text-white rounded px-4 py-3 text-lg font-bold shadow disabled:opacity-50"
          style={{ minHeight: 56 }}
          disabled={!barcode || collected || loading}
          onClick={handleConfirm}
        >
          {loading ? "Processing..." : "Confirm Collection"}
        </button>
      </div>
    </div>
  );
}
