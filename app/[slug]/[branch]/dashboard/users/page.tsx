"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MembershipRow = {
  _id: string;
  role: string;
  permissions: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    name?: string;
    email?: string;
    status?: "active" | "inactive";
  };
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchMemberships(labSlug: string, branchSlug: string) {
  const query = new URLSearchParams({ labSlug, branchSlug });
  const res = await fetch(`/api/roles?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch lab memberships" }));
    throw new Error(err.error || "Failed to fetch lab memberships");
  }
  return res.json();
}

export default function UsersPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const labSlug = pathParts[0] || "";
  const branchSlug = pathParts[1] || "";

  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const { isDarkMode } = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        if (!labSlug || !branchSlug) {
          throw new Error("Missing lab or branch slug");
        }
        const data = await fetchMemberships(labSlug, branchSlug);
        if (!isMounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to fetch lab memberships");
        setRows([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [labSlug, branchSlug]);

  const pageTheme = isDarkMode
    ? {
        shell: "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100",
        card: "rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm",
        mutedText: "text-slate-400",
        heading: "text-slate-100",
        input: "mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800",
        tableHead: "bg-slate-900 text-xs uppercase tracking-wide text-slate-400",
        tableBody: "divide-y divide-slate-800",
        row: "hover:bg-slate-800/60",
        deleteButton: "px-2 py-1 rounded text-xs font-semibold text-red-400 border border-red-700/50 hover:bg-red-950/40 transition",
        editButton: "px-2 py-1 rounded text-xs font-semibold text-blue-400 border border-blue-700/50 hover:bg-blue-950/40 transition",
        statusActive: "px-2 py-1 rounded text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-700/50",
        statusInactive: "px-2 py-1 rounded text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-700/50",
      }
    : {
        shell: "min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100",
        card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        mutedText: "text-slate-600",
        heading: "text-slate-900",
        input: "mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
        tableHead: "bg-white text-xs uppercase tracking-wide text-slate-500",
        tableBody: "divide-y divide-slate-100",
        row: "hover:bg-slate-50",
        deleteButton: "px-2 py-1 rounded text-xs font-semibold text-red-700 border border-red-300 hover:bg-red-50 transition",
        editButton: "px-2 py-1 rounded text-xs font-semibold text-blue-700 border border-blue-300 hover:bg-blue-50 transition",
        statusActive: "px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300",
        statusInactive: "px-2 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300",
      };

  return (
    <div className={pageTheme.shell}>
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className={`mb-6 ${pageTheme.card}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Branch Memberships
              </p>
              <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${pageTheme.heading}`}>Users</h1>
              <p className={`mt-1 text-sm ${pageTheme.mutedText}`}>All lab memberships for this branch.</p>
            </div>

            <Link
              href="../add-user"
              className={`${pageTheme.button} inline-block`}
            >
              + Add User
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Memberships</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{rows.filter((r) => r.status === "active").length}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Inactive</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{rows.filter((r) => r.status === "inactive").length}</p>
            </div>
          </div>
        </div>

        <div className={pageTheme.tableWrap}>
          {loading ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Loading users...
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={pageTheme.tableHead}>
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Permissions</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody className={pageTheme.tableBody}>
                  {rows.map((row) => (
                    <tr key={row._id} className={pageTheme.row}>
                      <td className="px-4 py-3 font-semibold">{row.user?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm">{row.user?.email || "-"}</td>
                      <td className="px-4 py-3 text-sm">{row.role || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={row.status === "active" ? pageTheme.statusActive : pageTheme.statusInactive}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{Array.isArray(row.permissions) && row.permissions.length > 0 ? row.permissions.join(", ") : "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
