import React from 'react';

type DiscountMode = 'percent' | 'fixed';

type Props = {
  enabled: boolean;
  mode: DiscountMode;
  value: number;
  subtotal: number;
  onToggle: () => void;
  onModeChange: (m: DiscountMode) => void;
  onValueChange: (v: number) => void;
  error: string | null;
  authorisedBy: string;
  onAuthorisedByChange: (v: string) => void;
};

export default function DiscountPanel({ enabled, mode, value, subtotal, onToggle, onModeChange, onValueChange, error, authorisedBy, onAuthorisedByChange }: Props) {
  const calcDiscount = () => {
    if (!enabled) return 0;
    if (mode === 'percent') return Math.round((value / 100) * subtotal);
    return value;
  };
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <input type="checkbox" checked={enabled} onChange={onToggle} id="discount-toggle" />
        <label htmlFor="discount-toggle" className="ml-2 font-semibold">Apply Discount</label>
      </div>
      {enabled && (
        <div className="flex gap-2 items-center mb-2">
          <select
            className="border rounded px-2 py-1"
            value={mode}
            onChange={e => onModeChange(e.target.value as DiscountMode)}
          >
            <option value="percent">%</option>
            <option value="fixed">₦</option>
          </select>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={value}
            min={0}
            max={mode === 'percent' ? 100 : subtotal}
            onChange={e => onValueChange(Number(e.target.value))}
          />
          <span className="text-xs text-gray-500">{mode === 'percent' ? '%' : '₦'}</span>
          <input
            type="text"
            className="border rounded px-2 py-1 w-40 text-sm ml-2"
            placeholder="Authorised by"
            value={authorisedBy}
            onChange={e => onAuthorisedByChange(e.target.value)}
            required
          />
          <span className="text-red-600 ml-1">*</span>
        </div>
      )}
      {enabled && (
        <div className="text-xs text-gray-600 mb-1">Discount: ₦{calcDiscount().toLocaleString()}</div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
