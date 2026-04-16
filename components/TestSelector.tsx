import React, { useState } from 'react';
import { LabTest } from '../types/test';
import { CartItem } from '../types/cart';

const mockTests: LabTest[] = [
  { id: 'T001', name: 'CBC', category: 'Hematology', price: 5000 },
  { id: 'T002', name: 'Blood Sugar', category: 'Biochemistry', price: 3000 },
  { id: 'T003', name: 'Lipid Profile', category: 'Biochemistry', price: 7000 },
  { id: 'T004', name: 'Malaria', category: 'Parasitology', price: 2000 },
  { id: 'T005', name: 'Urinalysis', category: 'Urine', price: 2500 },
];

const categories = Array.from(new Set(mockTests.map(t => t.category)));

type Props = {
  cart: CartItem[];
  onAdd: (test: LabTest) => void;
};

export default function TestSelector({ cart, onAdd }: Props) {
  const [query, setQuery] = useState('');
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Lab Tests</label>
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Search test by name"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-40 overflow-y-auto">
        {categories.map(cat => (
          <div key={cat}>
            <div className="font-semibold text-xs text-gray-600 mt-2 mb-1">{cat}</div>
            {mockTests.filter(t =>
              t.category === cat &&
              t.name.toLowerCase().includes(query.toLowerCase())
            ).map(test => {
              const inCart = cart.some(item => item.test.id === test.id);
              return (
                <div
                  key={test.id}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer hover:bg-blue-100 ${inCart ? 'bg-blue-50' : ''}`}
                  onClick={() => onAdd(test)}
                >
                  <span>{test.name}</span>
                  <span className="text-xs text-gray-500">₦{test.price.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
