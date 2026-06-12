
import React, { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { Patient } from '../types/patient';

type Props = {
  selected: Patient | null;
  onSelect: (p: Patient) => void;
  onAddNew: () => void;
  refreshKey?: number;
};


export default function PatientSelector({ selected, onSelect, onAddNew, refreshKey = 0 }: Props) {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  useEffect(() => {
    async function fetchPatients() {
      setLoading(true);
      try {
        // Extract branch from pathname
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1] || "";
        if (!branch) {
          setPatients([]);
          setLoading(false);
          return;
        }
        // Fetch branchId by slug
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          setPatients([]);
          setLoading(false);
          return;
        }
        const branchDoc = await branchRes.json();
        if (!branchDoc || !branchDoc._id) {
          setPatients([]);
          setLoading(false);
          return;
        }
        // Fetch patients by branchId
        const res = await fetch(`/api/patients?branchId=${branchDoc._id}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        } else {
          setPatients([]);
        }
      } catch {
        setPatients([]);
      }
      setLoading(false);
    }
    fetchPatients();
  }, [pathname, refreshKey]);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.number && p.number.includes(query)) ||
    (p.age && p.age.toString().includes(query)) ||
    (p.id && p.id.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Patient</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search patient by name, phone, or age"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto bg-white border rounded">
        {loading ? (
          <div className="p-2 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-2 text-gray-500">No patients found.</div>
        ) : (
          filtered.map(p => (
            <div
              key={p.id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${selected?.id === p.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">phone: {p.number} • age: {p.age} </div>
            </div>
          ))
        )}
      </div>
      <button
        className="mt-2 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        onClick={onAddNew}
        type="button"
      >
        + Add New Patient
      </button>
    </div>
  );
}
