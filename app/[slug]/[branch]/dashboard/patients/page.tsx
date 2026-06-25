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

  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const branchDoc = await fetchBranchBySlug(branch);
        if (!branchDoc || !branchDoc._id) throw new Error("Branch not found");
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

  return (
    <div className="p-4 max-w-4xl mx-auto w-full">
      <ToastContainer />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Patients</h1>
        <Link
          href="./add-patient"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition text-center font-semibold"
        >
          + Add Patient
        </Link>
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
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">No patients found.</td>
              </tr>
            ) : (
              patients.map((patient: any, idx: number) => (
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
    </div>
  );
}
