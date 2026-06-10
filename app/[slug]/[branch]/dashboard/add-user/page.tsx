"use client";

import React, { FormEvent, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AddUserPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const labSlug = pathParts[0] || "";
  const branchSlug = pathParts[1] || "";
  const { isDarkMode } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageTheme = isDarkMode
    ? {
        shell: "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100",
        card: "rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm md:p-6",
        heading: "text-slate-100",
        mutedText: "text-slate-400",
        input: "mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 transition focus:ring-2",
        buttonPrimary: "h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60",
        buttonGhost: "h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800",
      }
    : {
        shell: "min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100",
        card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        heading: "text-slate-900",
        mutedText: "text-slate-600",
        input: "mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2",
        buttonPrimary: "h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60",
        buttonGhost: "h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
      };

  const resetForm = () => {
    setName("");
    setEmail("");
    setStatus("active");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          status,
          labSlug,
          branchSlug,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to create user");
      }

      setSuccess(`User created and invite link sent to ${email.trim().toLowerCase()}.`);
      resetForm();
    } catch (err: any) {
      setError(err?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={pageTheme.shell}>
      <section className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className={pageTheme.card}>
          <div className="mb-5">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              User Management
            </p>
            <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${pageTheme.heading}`}>Add User</h1>
            <p className={`mt-1 text-sm ${pageTheme.mutedText}`}>
              Create a user account and automatically send an invite email with a password setup link.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full ${pageTheme.input}`}
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${pageTheme.input}`}
                placeholder="name@example.com"
                required
              />
            </div>

            {/* <div>
              <label className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className={`w-full ${pageTheme.input}`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div> */}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" disabled={submitting} className={pageTheme.buttonPrimary}>
                {submitting ? "Creating user..." : "Create User & Send Invite"}
              </button>
              <Link href="../users" className={pageTheme.buttonGhost + " inline-flex items-center"}>
                Back to Users
              </Link>
            </div>
            <input type="hidden" name="status" value="inactive" />
          </form>
        </div>
      </section>
    </div>
  );
}
