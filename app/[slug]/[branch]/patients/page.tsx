"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

type Patient = {
  id: string;
  name: string;
  number?: string;
  age?: number | string;
  gender?: string;
  email?: string;
  address?: string;
};

const emptyForm = { id: "", name: "", number: "", age: "", gender: "", email: "", address: "" };

export default function PatientsPage() {
  const pathname = usePathname();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPatient, setEditingPatient] = useState<typeof emptyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      setError("");
      try {
        const branchSlug = (pathname || "").split("/").filter(Boolean)[1];
        const branchResponse = await fetch(`/api/branches/${encodeURIComponent(branchSlug || "")}`);
        if (!branchResponse.ok) throw new Error("Unable to find this branch");
        const branchDocument = await branchResponse.json();
        const patientsResponse = await fetch(`/api/patients?branchId=${encodeURIComponent(branchDocument._id)}`);
        if (!patientsResponse.ok) throw new Error("Unable to load registered patients");
        setPatients(await patientsResponse.json());
      } catch (loadError: any) {
        setError(loadError?.message || "Unable to load registered patients");
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }

    if (pathname) loadPatients();
  }, [pathname]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredPatients = patients.filter((patient) =>
    !normalizedSearchQuery || [patient.name, patient.number, patient.email, patient.age, patient.gender, patient.address]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearchQuery))
  );

  const openEditDialog = (patient: Patient) => {
    setEditingPatient({
      id: patient.id,
      name: patient.name || "",
      number: patient.number || "",
      age: patient.age === undefined ? "" : String(patient.age),
      gender: patient.gender || "",
      email: patient.email || "",
      address: patient.address || "",
    });
  };

  const savePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPatient) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...editingPatient,
        name: editingPatient.name.trim(),
        number: editingPatient.number.trim(),
        email: editingPatient.email.trim(),
        address: editingPatient.address.trim(),
        age: editingPatient.age === "" ? undefined : Number(editingPatient.age),
      };
      const response = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update patient");

      setPatients((current) => current.map((patient) =>
        patient.id === editingPatient.id ? { ...patient, ...payload } : patient
      ));
      setEditingPatient(null);
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to update patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registry</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Registered Patients</h1>
            </div>
            <label className="w-full sm:w-72">
              <span className="sr-only">Search patients</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search patients"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {error ? <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading patients...</td></tr> : null}
                {!loading && filteredPatients.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No matching patients found.</td></tr> : null}
                {!loading && filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{patient.name}</td>
                    <td className="px-4 py-3 text-slate-700">{patient.number || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{patient.age || "-"}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{patient.gender || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{patient.email || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEditDialog(patient)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {editingPatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={savePatient} className="w-full max-w-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Update Patient</h2>
              <button type="button" onClick={() => setEditingPatient(null)} className="text-sm font-medium text-slate-600 hover:text-slate-900">Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["name", "number", "age", "gender", "email", "address"] as const).map((field) => (
                <label key={field} className={field === "address" ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
                  <span className="text-sm font-medium capitalize text-slate-700">{field === "number" ? "Phone" : field}</span>
                  <input
                    type={field === "age" ? "number" : field === "email" ? "email" : "text"}
                    min={field === "age" ? "0" : undefined}
                    required={field === "name"}
                    value={editingPatient[field]}
                    onChange={(event) => setEditingPatient((current) => current ? { ...current, [field]: event.target.value } : current)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingPatient(null)} disabled={saving} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Updating..." : "Update Patient"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}