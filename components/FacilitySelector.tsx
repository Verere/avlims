import React, { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { Facility } from '@/types/facility';




const walkIn: Facility = { id: 'private', name: 'PRIVATE', address: '' };

interface Props {
selected: Facility | null;
  onSelect: (r: Facility) => void;
  onAddNew: () => void;
  refreshKey?: number;
};

export default function FacilitySelector({ selected, onSelect, onAddNew, refreshKey = 0 }: Props) {
  const [query, setQuery] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchFacilities() {
      setLoading(true);
      try {
        // Extract branch from pathname
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1] || "";
        if (!branch) {
          setFacilities([]);
          setLoading(false);
          return;
        }
        // Fetch branchId by slug
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          setFacilities([]);
          setLoading(false);
          return;
        }
        const branchDoc = await branchRes.json();
        if (!branchDoc || !branchDoc._id) {
          setFacilities([]);
          setLoading(false);
          return;
        }
        // Fetch ref-clinics by branchId
        const res = await fetch(`/api/ref-clinics?branchId=${branchDoc._id}`);
        if (res.ok) {
          const data = await res.json();
          setFacilities(data.map((facility: { _id?: string; id?: string; name: string; address?: string }) => ({
            id: String(facility.id || facility._id || ""),
            name: facility.name,
            address: facility.address || "",
          })));
        } else {
          setFacilities([]);
        }
      } catch {
        setFacilities([]);
      }
      setLoading(false);
    }
    fetchFacilities();
  }, [pathname, refreshKey]);


  const filtered = [walkIn, ...facilities].filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.address || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Referring Facility/Clinic</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search facility/clinic"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto bg-white border rounded">
        {loading ? (
          <div className="p-2 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-2 text-gray-500">No Facility found.</div>
        ) : (
          filtered.map(r => (
            <div
              key={r.id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${selected?.id === r.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(r)}
            >
              <div className="font-medium">{r.name}</div>
              {r.name && <div className="text-xs text-gray-500">{r.address}</div>}
            </div>
          ))
        )}
      </div>
       <button
        className="mt-2 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        onClick={onAddNew}
        type="button"
      >
        + Add New Facility
      </button>
    </div>
  );
}

