"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

type MembershipUser = {
  _id: string;
  name?: string;
  email?: string;
  status?: "active" | "inactive";
};

type MembershipRow = {
  _id: string;
  role: string;
  status?: "active" | "inactive";
  branch?: string;
  permissions?: string[];
  user?: MembershipUser;
};

const ROLE_OPTIONS = [
  "owner",
  "admin",
  "manager",
  "technician",
  "cashier",
  "receptionist",
  "staff",
];

async function fetchRoles(labSlug: string, branchSlug: string) {
  const query = new URLSearchParams({ labSlug, branchSlug }).toString();
  const res = await fetch(`/api/roles?${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch roles" }));
    throw new Error(err.error || "Failed to fetch roles");
  }
  return res.json();
}

async function updateRole(membershipId: string, role: string) {
  const res = await fetch("/api/roles", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipId, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update role" }));
    throw new Error(err.error || "Failed to update role");
  }
  return res.json();
}

export default function RolesPage() {
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const labSlug = pathParts[0] || "";
  const branchSlug = pathParts[1] || "";

  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { isDarkMode } = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!labSlug || !branchSlug) {
        setError("Missing lab or branch in URL");
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const data = await fetchRoles(labSlug, branchSlug);
        if (!isMounted) return;

        const normalized = Array.isArray(data) ? data : [];
        setRows(normalized);

        const nextSelected: Record<string, string> = {};
        for (const row of normalized) {
          nextSelected[row._id] = row.role || "staff";
        }
        setSelectedRoles(nextSelected);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load roles");
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

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const key = (row.role || "staff").toLowerCase();
        acc.total += 1;
        acc.byRole[key] = (acc.byRole[key] || 0) + 1;
        return acc;
      },
      { total: 0, byRole: {} as Record<string, number> }
    );
  }, [rows]);

  const pageTheme = isDarkMode
    ? {
        shell: "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100",
        card: "rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm",
        mutedText: "text-slate-400",
        heading: "text-slate-100",
        input: "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60",
        tableHead: "bg-slate-900 text-xs uppercase tracking-wide text-slate-400",
        tableBody: "divide-y divide-slate-800",
        row: "hover:bg-slate-800/60",
      }
    : {
        shell: "min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100",
        card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        tableWrap: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        mutedText: "text-slate-600",
        heading: "text-slate-900",
        input: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2",
        button: "h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60",
        tableHead: "bg-white text-xs uppercase tracking-wide text-slate-500",
        tableBody: "divide-y divide-slate-100",
        row: "hover:bg-slate-50",
      };

  const handleRoleSave = async (row: MembershipRow) => {
    const nextRole = selectedRoles[row._id] || row.role || "staff";
    if (nextRole === row.role) {
      setSuccess("No changes to save for this member.");
      return;
    }

    setSavingId(row._id);
    setError("");
    setSuccess("");
    try {
      const updated = await updateRole(row._id, nextRole);
      setRows((prev) => prev.map((item) => (item._id === row._id ? { ...item, role: updated.role } : item)));
      setSuccess(`${row.user?.name || "Member"} role updated to ${nextRole}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update role");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className={pageTheme.shell}>
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className={`mb-6 ${pageTheme.card}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Access Control
          </p>
          <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${pageTheme.heading}`}>Roles</h1>
          <p className={`mt-1 text-sm ${pageTheme.mutedText}`}>Assign and update roles for all lab members in this branch.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Members</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{counts.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Admins</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{counts.byRole.admin || 0}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Technicians</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{counts.byRole.technician || 0}</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Staff</p>
              <p className="mt-1 text-lg font-bold text-violet-900">{counts.byRole.staff || 0}</p>
            </div>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

        <div className={pageTheme.tableWrap}>
          {loading ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Loading members...</div>
          ) : rows.length === 0 ? (
            <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No lab memberships found for this branch.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={pageTheme.tableHead}>
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Current Role</th>
                    <th className="px-4 py-3 text-left">Assign New Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={pageTheme.tableBody}>
                  {rows.map((row) => (
                    <tr key={row._id} className={pageTheme.row}>
                      <td className="px-4 py-3 font-semibold">{row.user?.name || "-"}</td>
                      <td className="px-4 py-3">{row.user?.email || "-"}</td>
                      <td className="px-4 py-3 capitalize">{row.role || "staff"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={selectedRoles[row._id] || row.role || "staff"}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [row._id]: e.target.value,
                            }))
                          }
                          className={pageTheme.input}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.status || row.user?.status || "active"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={savingId === row._id}
                          onClick={() => handleRoleSave(row)}
                          className={pageTheme.button}
                        >
                          {savingId === row._id ? "Saving..." : "Update Role"}
                        </button>
                      </td>
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
