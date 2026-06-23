"use client";
import React, { useState } from "react";

type RefClinicOption = {
  _id: string;
  name: string;
  address?: string;
};

interface ReferrerFormProps {
  onSubmit: (data: {
    name: string;
    address: string;
    phone: string;
    refClinic: string;
    bank: string;
    account: string;
    email: string;
  }) => void | Promise<void>;
  loading?: boolean;
  refClinics?: RefClinicOption[];
}

export default function ReferrerForm({ onSubmit, loading, refClinics = [] }: ReferrerFormProps) {
  const [form, setForm] = useState({
     name: "",
     address: "",
     phone: "",
     refClinic: "",
     bank: "",
     account: "",
     email: "",
   });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
      <form onSubmit={handleSubmit} className="bg-white overflow-y-auto rounded-xl shadow-lg p-6 flex flex-col gap-4 max-w-md mx-auto w-full md:w-96 mt-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Add Referrer</h2>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Ref Clinic</label>
          <select
            name="refClinic"
            value={form.refClinic}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          >
            <option value="">Select a ref clinic</option>
            {refClinics.map((clinic) => (
              <option key={clinic?._id} value={clinic._id}>{clinic.name} | {clinic?.address}</option>
            ))}
          </select>
          {refClinics.length === 0 && (
            <p className="text-xs text-red-600">No ref clinics found for this branch. Add a ref clinic first.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Bank</label>
          <input
            type="text"
            name="bank"
            value={form.bank}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Account</label>
          <input
            type="text"
            name="account"
            value={form.account}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading || refClinics.length === 0}
        >
          {loading ? "Adding..." : "Add Referrer"}
        </button>
        {/* {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mt-2 text-center">Referrer added successfully!</div>} */}
      </form>
  );
}
