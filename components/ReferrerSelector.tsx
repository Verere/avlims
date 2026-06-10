import React, { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";

type Referrer = {
  id: string;
  name: string;
  organization?: string;
};



const walkIn: Referrer = { id: 'walkin', name: 'Walk-in', organization: '' };

interface Props {
  selected: Referrer;
  onSelect: (r: Referrer) => void;
}

export default function ReferrerSelector({ selected, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchReferrers() {
      setLoading(true);
      try {
        // Extract branch from pathname
        const pathParts = (pathname || "").split("/").filter(Boolean);
        const branch = pathParts[1] || "";
        if (!branch) {
          setReferrers([]);
          setLoading(false);
          return;
        }
        // Fetch branchId by slug
        const branchRes = await fetch(`/api/branches/${branch}`);
        if (!branchRes.ok) {
          setReferrers([]);
          setLoading(false);
          return;
        }
        const branchDoc = await branchRes.json();
        if (!branchDoc || !branchDoc._id) {
          setReferrers([]);
          setLoading(false);
          return;
        }
        // Fetch referrers by branchId
        const res = await fetch(`/api/referrers?branchId=${branchDoc._id}`);
        if (res.ok) {
          const data = await res.json();
          setReferrers(data.map((r: any) => ({
            id: r._id,
            name: r.name,
            organization: r.refClinicName || '',
            refClinic: r.refClinicName || '',
          })));
        } else {
          setReferrers([]);
        }
      } catch {
        setReferrers([]);
      }
      setLoading(false);
    }
    fetchReferrers();
  }, [pathname]);


  const filtered = [walkIn, ...referrers].filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.organization || '').toLowerCase().includes(query.toLowerCase())
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
        {loading ? (
          <div className="p-2 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-2 text-gray-500">No referrers found.</div>
        ) : (
          filtered.map(r => (
            <div
              key={r.id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${selected.id === r.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(r)}
            >
              <div className="font-medium">{r.name}</div>
              {r.organization && <div className="text-xs text-gray-500">{r.organization}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

