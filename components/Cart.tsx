"use client"
import React from 'react';
import { CartItem } from '../types/cart';

type Props = {
  cart: CartItem[];
  onRemove: (id: string) => void;
  subtotal: number;
  discount: number;
  total: number;
};

export default function Cart({ cart, onRemove, subtotal, discount, total }: Props) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2 text-lg">Cart</h2>
      {cart.length === 0 ? (
        <div className="text-gray-500">No tests selected.</div>
      ) : (
        <div>
          {cart.map(item => (
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
            <div className="flex justify-between mb-1">
              <span>Discount</span>
              <span>-₦{discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-blue-700">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
