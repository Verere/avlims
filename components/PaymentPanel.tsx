import React from 'react';


type PaymentMethod = 'cash' | 'transfer' | 'pos';
type PaymentEntry = { method: PaymentMethod; amount: number };
type Props = {
  payments: PaymentEntry[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentEntry[]>>;
  total: number;
  balance: number;
  onComplete: () => void;
  onPending: () => void;
  disabled: boolean;
  isPaying?: boolean;
};

export default function PaymentPanel({ payments, setPayments, total, balance, onComplete, onPending, disabled, isPaying }: Props) {
  const handleMethodChange = (idx: number, method: PaymentMethod) => {
    setPayments(p => p.map((entry, i) => i === idx ? { ...entry, method } : entry));
  };
  const handleAmountChange = (idx: number, amount: number) => {
    setPayments(p => p.map((entry, i) => i === idx ? { ...entry, amount } : entry));
  };
  const handleAddPayment = () => {
    setPayments(p => [...p, { method: 'cash', amount: 0 }]);
  };
  const handleRemovePayment = (idx: number) => {
    setPayments(p => p.length === 1 ? p : p.filter((_, i) => i !== idx));
  };
  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2 text-lg">Payment</h2>
      {payments.map((entry, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-end">
          <div className="flex-1">
            <label className="block mb-1">Method</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={entry.method}
              onChange={e => handleMethodChange(idx, e.target.value as PaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block mb-1">Amount</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={entry.amount}
              min={0}
              max={total}
              onChange={e => handleAmountChange(idx, Number(e.target.value))}
            />
          </div>
          <button
            className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
            onClick={() => handleRemovePayment(idx)}
            disabled={payments.length === 1}
            type="button"
          >Remove</button>
        </div>
      ))}
      <button
        className="bg-green-600 text-white px-3 py-1 rounded mb-2"
        onClick={handleAddPayment}
        type="button"
      >+ Add Payment</button>
      <div className="mb-2 flex justify-between text-sm">
        <span>{balance < 0 ? 'Change' : 'Balance'}</span>
        <span className={balance < 0 ? 'text-green-700' : 'text-red-700'}>
          ₦{Math.abs(balance).toLocaleString()}
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="flex-1 bg-blue-700 text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
          onClick={onComplete}
          disabled={disabled}
          type="button"
        >
          {isPaying ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : null}
          {isPaying ? 'Processing...' : 'Complete Payment'}
        </button>
        <button
          className="flex-1 bg-gray-400 text-white py-2 rounded"
          onClick={onPending}
          type="button"
        >
          Bill To
        </button>
      </div>
    </div>
  );
}
