"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./actions";
import { useRef, useState } from "react";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(
  forgotPasswordAction,
  {
    success: false,
    error: "",
  }
); const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        ref={formRef}
        action={async (...args) => {
          setLoading(true);
          try {
            await formAction(...args);
          } finally {
            setLoading(false);
          }
        }}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        <p className="text-gray-600 text-center text-sm mb-2">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="border rounded px-3 py-2"
          required
        />
        {state.error && <div className="text-red-500 text-sm text-center">{state.error}</div>}
        {state.success && !state.error && (
          <div className="text-green-600 text-sm text-center">
            If an account with that email exists, a reset link has been sent.
          </div>
        )}
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
          Send Reset Link
        </button>
        <div className="text-center text-sm mt-2">
          <a href="/login" className="text-blue-600 hover:underline">Back to login</a>
        </div>
      </form>
    </main>
  );
}
