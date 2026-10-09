"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type InviteDetails = {
  name: string;
  email: string;
  labName: string;
  branchName: string;
  role: string;
};

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading invitation...</main>}>
      <ActivateAccountForm />
    </Suspense>
  );
}

function ActivateAccountForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      if (!token) {
        setError("This invitation link is missing its token.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/activate-invited-user?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to validate invitation");
        if (isMounted) setInvite(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Unable to validate invitation");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInvite();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/activate-invited-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to activate account");
      setActivated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LIMS account invitation</p>
        <h1 className="mt-2 text-2xl font-bold">Activate your account</h1>

        {loading ? (
          <p className="mt-5 text-sm text-slate-600">Checking your invitation...</p>
        ) : activated ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-emerald-700">Your email is verified and your account is active.</p>
            <Link href="/login" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
              Continue to sign in
            </Link>
          </div>
        ) : invite ? (
          <>
            <dl className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{invite.name}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{invite.email}</dd></div>
              <div><dt className="text-slate-500">Lab</dt><dd className="font-medium">{invite.labName}</dd></div>
              <div><dt className="text-slate-500">Branch</dt><dd className="font-medium">{invite.branchName}</dd></div>
              <div><dt className="text-slate-500">Role</dt><dd className="font-medium capitalize">{invite.role}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-slate-600">Choose a password to verify your email and activate your branch access.</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="flex flex-col text-sm font-medium">
                Password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={submitting} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Activating..." : "Verify email and activate"}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-5 space-y-4">
            <p role="alert" className="text-sm text-red-600">{error || "This invitation is invalid or has expired."}</p>
            <Link href="/login" className="text-sm font-medium text-blue-700 hover:underline">Return to sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
}