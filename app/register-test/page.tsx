"use client";
import { useState, useMemo } from "react";

// Dummy data for patients and tests (replace with API calls in production)
const patients = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
];
const tests = [
  { id: "cbc", name: "CBC", price: 50 },
  { id: "cmp", name: "CMP", price: 70 },
  { id: "lipid", name: "Lipid Panel", price: 60 },
];
const referrals = [
  { id: "r1", name: "Dr. Adams" },
  { id: "r2", name: "Dr. Baker" },
];

export default function RegisterTestPage() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "" });
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showReferral, setShowReferral] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<string>("");

  // Cart total
  const total = useMemo(
    () => selectedTests.reduce((sum, id) => sum + (tests.find(t => t.id === id)?.price || 0), 0),
    [selectedTests]
  );

  // Patient search
  const [patientSearch, setPatientSearch] = useState("");
  const filteredPatients = useMemo(
    () => patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())),
    [patientSearch]
  );

  // Test selection
  function toggleTest(id: string) {
    setSelectedTests(tests =>
      tests.includes(id) ? tests.filter(tid => tid !== id) : [...tests, id]
    );
  }


  // Register action
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  async function handleRegister() {
    setRegistering(true);
    setRegisterError("");
    setRegisterSuccess(false);
    try {
      for (const testId of selectedTests) {
        const test = tests.find(t => t.id === testId);
        if (!test) continue;
        const res = await fetch("/api/test-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lab: "lab1", // Replace with actual lab context
            patient: selectedPatient,
            testType: test.id,
            orderedBy: "user1", // Replace with actual user context
            price: test.price,
            referredBy: selectedReferral || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to register test");
        }
      }
      setRegisterSuccess(true);
      setSelectedTests([]);
    } catch (e: any) {
      setRegisterError(e.message);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 flex flex-col">
      <div className="max-w-md w-full mx-auto p-4 flex-1">
        <h1 className="text-xl font-bold mb-4">Register Test</h1>
        {/* Patient selection */}
        <div className="mb-4">
          <label className="block font-medium mb-1 text-lg">Patient</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 mb-2 text-lg"
            placeholder="Search patient..."
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
          />
          <div className="max-h-32 overflow-y-auto bg-white rounded shadow">
            {filteredPatients.map(p => (
              <button
                key={p.id}
                className={`block w-full text-left px-3 py-2 hover:bg-blue-50 text-base ${selectedPatient === p.id ? "bg-blue-100 font-semibold" : ""}`}
                style={{ minHeight: 44 }}
                onClick={() => setSelectedPatient(p.id)}
              >
                {p.name}
              </button>
            ))}
            <button
              className="block w-full text-left px-3 py-2 text-blue-700 font-semibold border-t border-gray-200 bg-blue-50"
              style={{ minHeight: 44 }}
              onClick={() => setShowAddPatient(true)}
            >
              + Add new patient
            </button>
          </div>
          {showAddPatient && (
            <div className="mt-2 p-3 bg-white rounded shadow flex flex-col gap-2">
              <input
                className="border rounded px-3 py-2 text-lg"
                placeholder="Patient name"
                value={newPatient.name}
                onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
              />
              <button
                className="bg-blue-700 text-white rounded px-4 py-2 text-lg font-medium"
                style={{ minHeight: 44 }}
                onClick={() => {
                  // In production, call API to add
                  patients.push({ id: Date.now().toString(), name: newPatient.name });
                  setSelectedPatient(Date.now().toString());
                  setShowAddPatient(false);
                  setNewPatient({ name: "" });
                }}
                disabled={!newPatient.name.trim()}
              >
                Save
              </button>
              <button
                className="text-gray-600 mt-1"
                onClick={() => setShowAddPatient(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {/* Test selection */}
        <div className="mb-4">
          <label className="block font-medium mb-1 text-lg">Select Tests</label>
          <div className="flex flex-col gap-3">
            {tests.map(test => (
              <button
                key={test.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-lg font-medium shadow-sm transition-colors ${selectedTests.includes(test.id) ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-900 border-gray-200"}`}
                style={{ minHeight: 56 }}
                onClick={() => toggleTest(test.id)}
                aria-pressed={selectedTests.includes(test.id)}
              >
                <span>{test.name}</span>
                <span className="font-bold">${test.price}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Referral selection (collapsible) */}
        <div className="mb-4">
          <button
            className="text-blue-700 underline text-base"
            onClick={() => setShowReferral(v => !v)}
            aria-expanded={showReferral}
          >
            {showReferral ? "Hide Referral" : "Add Referral (optional)"}
          </button>
          {showReferral && (
            <select
              className="w-full border rounded px-3 py-2 mt-2 text-lg"
              value={selectedReferral}
              onChange={e => setSelectedReferral(e.target.value)}
            >
              <option value="">Select referral</option>
              {referrals.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {/* Sticky cart summary and action */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50 p-4 flex flex-col gap-2 md:max-w-md md:left-1/2 md:-translate-x-1/2">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Selected Tests: {selectedTests.length}</span>
          <span>Total: <span className="text-blue-700 font-bold">${total}</span></span>
        </div>
        <button
          className="w-full bg-blue-700 text-white rounded px-4 py-3 text-lg font-bold shadow disabled:opacity-50"
          style={{ minHeight: 56 }}
          disabled={!selectedPatient || selectedTests.length === 0 || registering}
          onClick={handleRegister}
        >
          {registering ? "Registering..." : "Register Test(s)"}
        </button>
        {registerError && <div className="text-red-600 text-center mt-2">{registerError}</div>}
        {registerSuccess && <div className="text-green-700 text-center mt-2">Registration successful!</div>}
      </div>
    </div>
  );
}
