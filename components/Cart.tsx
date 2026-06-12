"use client"
import React from 'react';
import { CartItem } from '../types/cart';

type Props = {
  cart: CartItem[];
  onRemove: (id: string) => void;
  subtotal: number;
  discount: number;
  total: number;
  bonus?: number;
  onBonusChange?: (v: number) => void;
  revenue?: number;
  patientName?: string;
};

export default function Cart({ cart, onRemove, subtotal, discount, total, bonus = 0, onBonusChange, revenue = 0, patientName }: Props) {
  const panelGroups = new Map<string, { name: string; price: number; tests: CartItem[] }>();
  const standaloneItems: CartItem[] = [];

  for (const item of cart) {
    if (item.panel) {
      const existing = panelGroups.get(item.panel.id);
      if (existing) {
        existing.tests.push(item);
      } else {
        panelGroups.set(item.panel.id, {
          name: item.panel.name,
          price: Number(item.panel.price || 0),
          tests: [item],
        });
      }
    } else {
      standaloneItems.push(item);
    }
  }

  return (
    <div className="mb-4">
      {patientName && (
        <div className="font-bold text-blue-700 text-base mb-2 text-center">Patient: {patientName}</div>
      )}
      <h2 className="font-semibold mb-2 text-lg">Cart</h2>
      {cart.length === 0 ? (
        <div className="text-gray-500">No tests selected.</div>
      ) : (
        <div>
          {Array.from(panelGroups.entries()).map(([panelId, group]) => (
            <div key={panelId} className="border-b py-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-blue-800">{group.name}</div>
                  <div className="text-xs text-gray-500">Panel ({group.tests.length} tests)</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">₦{group.price.toLocaleString()}</span>
                  <button
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={() => onRemove(`panel:${panelId}`)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-1 pl-3">
                {group.tests.map((item) => (
                  <div key={item.test.id} className="text-xs text-gray-600">
                    • {item.test.name}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {standaloneItems.map(item => (
            <div key={item.test.id} className="flex justify-between items-center border-b py-2">
              <div>
                <div className="font-medium">{item.test.name}</div>
                <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">₦{(item.test.price * item.quantity).toLocaleString()}</span>
                <button
                  className="text-red-500 hover:text-red-700 text-xs"
                  onClick={() => onRemove(item.test.id)}
                  type="button"
                >Remove</button>
              </div>
            </div>
          ))}

          <div className="mt-4 text-sm">
            <div className="flex justify-between mb-1">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1 items-center gap-2">
              <span>Discount</span>
              <span className="flex items-center gap-2">
                <span>-₦{discount.toLocaleString()}</span>
              </span>
            </div>
            <div className="flex justify-between mb-1 items-center">
              <span>Bonus</span>
              <input
                type="number"
                className="border rounded px-2 py-1 w-24 text-right bg-gray-100"
                value={bonus}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-blue-700">₦{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-2 hidden">
              <span>Revenue</span>
              <span className="text-green-700">₦{revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
