"use client";
import { signupAction } from "@/app/signup/actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { useRef } from "react";

type AuthState = {
  success: boolean;
  error: string;
};

export default function Signup() {

  const [state, formAction] = useActionState(signupAction, {
  success: false,
  error: "",
});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        ref={formRef}
        action={formAction}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">Sign Up</h1>
        <input
          type="hidden"
          name="test"
          value="hello"
        />
        <input
          type="text"
          name="name"
          placeholder="Name"
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="border rounded px-3 py-2"
          required
        />
        <SignupSubmitButton />
        {state.error && <div className="text-red-500 text-sm text-center">{state.error}</div>}
        {state.success && <div className="text-green-600 text-sm text-center">Signup successful! Please check your email inbox to verify your account before logging in.</div>}
        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </div>
      </form>
    </main>
  );
}

function SignupSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending && (
        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}
      {pending ? "Signing Up..." : "Sign Up"}
    </button>
  );
}