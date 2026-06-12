"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { resetPasswordAction } from "./actions";

type ResetPasswordState = {
  success: boolean;
  error: string;
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</main>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [state, formAction] = useActionState<
  ResetPasswordState,
  FormData
>(
  resetPasswordAction,
  {
    success: false,
    error: "",
  }
); const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormAction = async (formData: FormData) => {
    setLoading(true);
    try {
      if (!password || password.length < 6) {
        setLoading(false);
        return { error: "Password must be at least 6 characters." };
      }
      if (password !== confirm) {
        setLoading(false);
        return { error: "Passwords do not match." };
      }
      formData.set("token", token);
      formData.set("password", password);
      return await formAction(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        action={formAction}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">Reset Password</h1>
        {!token && <div className="text-red-500 text-sm text-center">Invalid or missing token.</div>}
        {state.error && <div className="text-red-500 text-sm text-center">{state.error}</div>}
        {state.success && <div className="text-green-600 text-sm text-center">Password reset! You can now <a href='/login' className='text-blue-600 hover:underline'>log in</a>.</div>}
        {!state.success && token && <>
          <input
            type="password"
            name="password"
            placeholder="New Password"
            className="border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            name="confirm"
            placeholder="Confirm Password"
            className="border rounded px-3 py-2"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
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
            Reset Password
          </button>
        </>}
        <div className="text-center text-sm mt-2">
          <a href="/login" className="text-blue-600 hover:underline">Back to login</a>
        </div>
      </form>
    </main>
  );
}
