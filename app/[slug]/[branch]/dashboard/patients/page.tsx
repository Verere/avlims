"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";
import Link from "next/link";

async function fetchBranchBySlug(branch) {
  try {
    const res = await fetch(`/api/branches/${branch}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


async function fetchPatientsByBranchId(branchId) {
  try {
    const res = await fetch(`/api/patients?branchId=${branchId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function softDeletePatient(id) {
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

export default function PatientsPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleDelete = async (patient) => {
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
              setPatients((prev) => prev.filter((p) => (p._id || p.id) !== (patient._id || patient.id)));
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
              patients.map((patient, idx) => (
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
                      onClick={() => alert(`Edit patient: ${patient.name}`)}
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
    </div>
  );
}
