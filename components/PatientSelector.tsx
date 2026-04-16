import React, { useState } from 'react';
import { Patient } from '../types/patient';

const mockPatients: Patient[] = [
  { id: 'P001', name: 'John Doe', phone: '555-1234' },
  { id: 'P002', name: 'Jane Smith', phone: '555-5678' },
  { id: 'P003', name: 'Alice Johnson', phone: '555-8765' },
];

type Props = {
  selected: Patient | null;
  onSelect: (p: Patient) => void;
  onAddNew: () => void;
};

export default function PatientSelector({ selected, onSelect, onAddNew }: Props) {
  const [query, setQuery] = useState('');
  const filtered = mockPatients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.phone.includes(query) ||
    p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Patient</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search patient by name, phone, or ID"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto bg-white border rounded">
        {filtered.length === 0 ? (
          <div className="p-2 text-gray-500">No patients found.</div>
        ) : (
          filtered.map(p => (
            <div
              key={p.id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${selected?.id === p.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{p.phone} • {p.id}</div>
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
