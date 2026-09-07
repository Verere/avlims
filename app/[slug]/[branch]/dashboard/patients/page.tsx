"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";
import Link from "next/link";

async function fetchBranchBySlug(branch: any) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


async function fetchPatientsByBranchId(branchId: string) {
  try {
    const res = await fetch(`/api/patients?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function softDeletePatient(id: string) {
  try {
    const res = await fetch("/api/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch {
    return { error: "Failed to delete" };
  }
}

const emptyEditForm = {
  id: "",
  name: "",
  number: "",
  age: "",
  gender: "",
  email: "",
  address: "",
};

type PatientRow = {
  _id?: string;
  id?: string;
  name?: string;
  number?: string;
  age?: number | string;
  gender?: string;
  email?: string;
  address?: string;
};
type TestOrder = {
  _id: string;
  transId?: string;
  tests?: Array<{ name?: string; quantity?: number; panel?: { name?: string } }>;
  amount?: number;
  bal?: number;
  status?: string;
  bDate?: string;
  createdAt?: string;
};

export default function PatientsPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>(emptyEditForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchId, setBranchId] = useState("");
 
  const [historyPatient, setHistoryPatient] = useState<PatientRow | null>(null);
  const [patientOrders, setPatientOrders] = useState<TestOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredPatients = patients.filter((patient) => {
    if (!normalizedSearchQuery) return true;
    return [patient.name, patient.number, patient.email, patient.age, patient.gender, patient.address]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery));
  });

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
        setBranchId(String(branchDoc._id));
        const data = await fetchPatientsByBranchId(branchDoc._id);
        console.log('Fetched patients:', data);
        setPatients(data);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch patients");
        setPatients([]);
      }
      setLoading(false);
    }
    if (branch) fetchData();
  }, [branch]);

  const handleDelete = async (patient: any) => {
    toast.warn(
      <div>
        Delete <b>{patient.name}</b>?<br />
        <button
          className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          onClick={async () => {
            toast.dismiss();
            const res = await softDeletePatient(patient._id || patient.id);
            if (res.success) {
              toast.success("Patient deleted");
              // Refresh patients list
              setPatients((prev) => prev.filter((p: any) => (p._id || p.id) !== (patient._id || patient.id)));
            } else {
              toast.error(res.error || "Failed to delete");
            }
          }}
        >
          Confirm Delete
        </button>
      </div>,
      { autoClose: false, closeOnClick: false }
    );
  };

  const openEditModal = (patient: any) => {
    setEditForm({
      id: patient._id || patient.id || "",
      name: patient.name || "",
      number: patient.number || "",
      age: patient.age ?? "",
      gender: patient.gender || "",
      email: patient.email || "",
      address: patient.address || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        id: editForm.id,
        name: editForm.name.trim(),
        number: editForm.number.trim(),
        gender: editForm.gender,
        email: editForm.email.trim(),
        address: editForm.address.trim(),
      };

      if (editForm.age !== "") {
        payload.age = Number(editForm.age);
      }

      const res = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update patient");
      }

      setPatients((prev: any[]) =>
        prev.map((patient: any) => {
          const currentId = patient._id || patient.id;
          if (currentId !== editForm.id) return patient;
          return {
            ...patient,
            ...payload,
          };
        })
      );

      toast.success("Patient updated");
      setIsEditOpen(false);
      setEditForm(emptyEditForm);
    } catch (saveError: any) {
      toast.error(saveError?.message || "Failed to update patient");
    } finally {
      setIsSaving(false);
    }
  };

  //  const openHistoryDialog = async (patient: PatientRow) => {
   
  //   setHistoryPatient(patient);
  //   setPatientOrders([]);
  //   setHistoryError("");
  //   setHistoryLoading(true);
  //   try {
  //     const response = await fetch(`/api/test-orders?branchId=${encodeURIComponent(branchId)}&patientId=${encodeURIComponent(patient.id)}`);
  //     if (!response.ok) {
  //       const payload = await response.json().catch(() => ({ error: "Unable to load patient history" }));
  //       throw new Error(payload.error || "Unable to load patient history");
  //     }
  //     const data = await response.json();
  //     setPatientOrders(Array.isArray(data) ? data : []);
  //   } catch (historyLoadError: any) {
  //     setHistoryError(historyLoadError?.message || "Unable to load patient history");
  //   } finally {
  //     setHistoryLoading(false);
  //   }
  // };

  // const exportPatientHistory = () => {
  //   if (!historyPatient || patientOrders.length === 0) return;
  //   const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  //   const rows = patientOrders.map((order) => [
  //     formatDate(order.bDate || order.createdAt),
  //     order.transId || order._id,
  //     (order.tests || []).map((test) => test.panel?.name || `${test.name || "Test"}${test.quantity ? ` x${test.quantity}` : ""}`).join(", "),
  //     order.status || "-",
  //     Number(order.amount || 0).toFixed(2),
  //     Number(order.bal || 0).toFixed(2),
  //   ]);
  //   const csv = [["Date", "Transaction ID", "Tests", "Status", "Amount", "Balance"], ...rows]
  //     .map((row) => row.map(escapeCsv).join(","))
  //     .join("\r\n");
  //   const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.download = `${historyPatient.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "patient"}-test-order-history.csv`;
  //   link.click();
  //   URL.revokeObjectURL(url);
  // };

  return (
    <div className="p-4 max-w-4xl mx-auto w-full">
      <ToastContainer />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Patients</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search patients"
            aria-label="Search patients"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
          />
          <Link
            href="./add-patient"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition text-center font-semibold whitespace-nowrap"
          >
            + Add Patient
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Age</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Gender</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">No matching patients found.</td>
              </tr>
            ) : (
              filteredPatients.map((patient: any, idx: number) => (
                <tr
                  key={patient._id || patient.id}
                  className={
                    `transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100/60`
                  }
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{patient.name?.toUpperCase()}</td>
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{patient.number}</td>
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{patient.age}</td>
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{patient.gender}</td>
                  <td className="px-4 py-3 text-center flex gap-2 justify-center">
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
                      onClick={() => openEditModal(patient)}
                      title="Edit Patient"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a1 1 0 01-1.213-1.213l1-4a4 4 0 01.828-1.414z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition"
                      onClick={() => handleDelete(patient)}
                      title="Delete Patient"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Delete
                    </button>
                    {/* <button type="button" onClick={() => openHistoryDialog(patient)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          View History
                        </button> */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Patient</h2>
                <p className="text-sm text-slate-500">Update patient details and save changes.</p>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200"
                onClick={() => setIsEditOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Name</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Phone</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.number}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, number: e.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Age</span>
                <input
                  type="number"
                  min="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.age}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, age: e.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Gender</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  value={editForm.gender}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, email: e.target.value }))}
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Address</span>
                <textarea
                  rows={3}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, address: e.target.value }))}
                />
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
       {/* {historyPatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setHistoryPatient(null)}>
          <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient History</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{historyPatient.name}</h2>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={exportPatientHistory} disabled={historyLoading || patientOrders.length === 0} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">Export CSV</button>
                <button type="button" onClick={() => setHistoryPatient(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Close</button>
              </div>
            </div>
            {historyError ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{historyError}</p> : null}
            <div className="overflow-x-auto border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Transaction ID</th><th className="px-4 py-3">Tests</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading test-order history...</td></tr> : null}
                  {!historyLoading && !historyError && patientOrders.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No test orders found for this patient.</td></tr> : null}
                  {!historyLoading && patientOrders.map((order) => <tr key={order._id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(order.bDate || order.createdAt)}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{order.transId || "-"}</td><td className="px-4 py-3 text-slate-700">{(order.tests || []).map((test) => test.panel?.name || `${test.name || "Test"}${test.quantity ? ` x${test.quantity}` : ""}`).join(", ") || "-"}</td><td className="px-4 py-3 capitalize text-slate-700">{order.status || "-"}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(order.amount)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">{formatCurrency(order.bal)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null} */}
    </div>
  );
}
