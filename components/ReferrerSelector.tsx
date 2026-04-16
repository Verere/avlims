import React, { useState } from 'react';

type Referrer = {
  id: string;
  name: string;
  organization: string;
};

const mockReferrers: Referrer[] = [
  { id: 'R001', name: 'Dr. Adebayo', organization: 'General Hospital' },
  { id: 'R002', name: 'Dr. Okafor', organization: 'City Clinic' },
  { id: 'R003', name: 'Dr. Bello', organization: 'Private Practice' },
];

const walkIn: Referrer = { id: 'walkin', name: 'Walk-in', organization: '' };

interface Props {
  selected: Referrer;
  onSelect: (r: Referrer) => void;
}

export default function ReferrerSelector({ selected, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = [walkIn, ...mockReferrers].filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.organization.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Referrer</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search referrer"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto bg-white border rounded">
        {filtered.map(r => (
          <div
            key={r.id}
            className={`p-2 cursor-pointer hover:bg-blue-100 ${selected.id === r.id ? 'bg-blue-50' : ''}`}
            onClick={() => onSelect(r)}
          >
            <div className="font-medium">{r.name}</div>
            {r.organization && <div className="text-xs text-gray-500">{r.organization}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
