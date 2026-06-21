"use client";
import React, { useState } from "react";

interface ReferrerFormProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  refClinics?: any[];
}

export default function RefClinicForm({ onSubmit, loading,  }: ReferrerFormProps) {
  const [form, setForm] = useState({
     name: "",
     address: "",
    
   });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
					 <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 max-w-md mx-auto w-full md:w-96 mt-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Add Ref Clinic</h2>
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
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Ref Clinic"}
        </button>
        {/* {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mt-2 text-center">Ref Clinic added successfully!</div>} */}
      </form>
  );
}
