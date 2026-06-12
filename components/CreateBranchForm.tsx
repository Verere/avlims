"use client"
import { useActionState } from "react";
import { BranchState, createBranchAction } from "@/app/dashboard/lab/create-branch/actions";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";


const initialState: BranchState = {
  success: false,
  error: "",
};

export default function CreateBranchForm({ labId }: { labId: string }) {
 
  const [state, formAction] = useActionState(
  createBranchAction,
  initialState
);
  const [branch, setBranch] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
//     return <div className="text-center mt-10 text-red-600">No lab selected for branch creation.</div>;
//   }

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        router.push("/dashboard");
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
    >
      <h1 className="text-2xl font-bold text-center">Create New Branch</h1>
      <input type="hidden" name="labId" value={labId} />
      <input
        type="text"
        name="branch"
        placeholder="Branch Name"
        className="border rounded px-3 py-2"
        value={branch}
        onChange={e => setBranch(e.target.value)}
        required
      />
      <input
        type="text"
        name="address"
        placeholder="Address"
        className="border rounded px-3 py-2"
        value={address}
        onChange={e => setAddress(e.target.value)}
        required
      />
      <input
        type="text"
        name="phone"
        placeholder="Phone"
        className="border rounded px-3 py-2"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        required
      />
      {state.error && <div className="text-red-500 text-sm text-center">{state.error}</div>}
      {state.success && <div className="text-green-600 text-sm text-center">Branch created successfully!</div>}
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
        Create Branch
      </button>
    </form>
  );
}
