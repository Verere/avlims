import React from 'react';

type PaymentMethod = 'cash' | 'transfer' | 'pos';

type Props = {
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  amountPaid: number;
  onAmountPaidChange: (v: number) => void;
  total: number;
  balance: number;
  onComplete: () => void;
  onPending: () => void;
  disabled: boolean;
};

export default function PaymentPanel({ method, onMethodChange, amountPaid, onAmountPaidChange, total, balance, onComplete, onPending, disabled }: Props) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2 text-lg">Payment</h2>
      <div className="mb-2">
        <label className="block mb-1">Payment Method</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={method}
          onChange={e => onMethodChange(e.target.value as PaymentMethod)}
        >
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="pos">POS</option>
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1">Amount Paid</label>
        <input
          type="number"
          className="border rounded px-3 py-2 w-full"
          value={amountPaid}
          min={0}
          max={total}
          onChange={e => onAmountPaidChange(Number(e.target.value))}
        />
      </div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{balance < 0 ? 'Change' : 'Balance'}</span>
        <span className={balance < 0 ? 'text-green-700' : 'text-red-700'}>
          ₦{Math.abs(balance).toLocaleString()}
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="flex-1 bg-blue-700 text-white py-2 rounded disabled:opacity-50"
          onClick={onComplete}
          disabled={disabled}
          type="button"
        >
          Complete Payment
        </button>
        <button
          className="flex-1 bg-gray-400 text-white py-2 rounded"
          onClick={onPending}
          type="button"
        >
          Save as Pending
        </button>
      </div>
    </div>
  );
}
