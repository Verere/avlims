"use client";

import { useActionState } from "react";
import { createLabAction } from "@/app/dashboard/create-lab/actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


export default function CreateLabForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createLabAction, { success: false, error: null });
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.success) {
      // Redirect after short delay for UX
      const timeout = setTimeout(() => {
        router.push("/dashboard");
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        formData.set("name", name);
        await formAction(formData);
        setLoading(false);
      }}
      className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
    >
      <h1 className="text-2xl font-bold text-center">Create New Lab</h1>
      <input
        type="text"
        name="name"
        placeholder="Lab Name"
        className="border rounded px-3 py-2"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      {state.error && <div className="text-red-500 text-sm text-center">{state.error}</div>}
      {state.success && <div className="text-green-600 text-sm text-center">Lab created successfully!</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        )}
        Create Lab
      </button>
    </form>
  );
}
