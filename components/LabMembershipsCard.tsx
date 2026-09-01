"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { HiUserGroup, HiLocationMarker, HiUser, HiCheckCircle, HiOutlineArrowRight } from "react-icons/hi";

type Membership = {
  _id: string;
  lab?: string;
  branch?: string;
  name: string;
  role: string;
  status: string;
};

export default function LabMembershipsCard({ memberships }: { memberships: Membership[] }) {
  const router = useRouter();
  const toRouteSegment = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  if (!memberships || memberships.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        You are not a member of any lab yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      {memberships.map((m) => (
        <div
          key={m._id}
          className="relative group bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg border border-blue-100 dark:border-slate-700 rounded-3xl shadow-[0_4px_32px_0_rgba(16,30,54,0.08),0_1.5px_4px_0_rgba(0,0,0,0.03)] p-6 flex flex-col gap-3 min-w-0 transition-all duration-300 ease-out hover:scale-[1.025] hover:shadow-2xl hover:border-blue-400 dark:hover:border-cyan-400"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.10) 100%)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.10), 0 1.5px 4px 0 rgba(0,0,0,0.03)",
          }}
        >
          {/* Decorative gradient accent */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-br-3xl bg-gradient-to-tr from-blue-400/30 via-purple-400/20 to-cyan-300/10 blur-2xl opacity-60 pointer-events-none" />

          {/* Icon, Name left; Role/Status right */}
          <div className="flex items-center justify-between gap-2 mb-1 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-400 via-purple-400 to-emerald-400 text-white shadow-md">
                <HiUserGroup size={22} />
              </span>
              <span className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-100 ml-1 tracking-tight truncate">
                {m.name}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-tr from-blue-100 via-blue-200 to-cyan-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 shadow-sm uppercase tracking-wide`}> <HiUser className="inline" /> {m.role}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${m.status === "active" ? "bg-gradient-to-tr from-emerald-100 via-green-200 to-cyan-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300"} shadow-sm uppercase tracking-wide`}> <HiCheckCircle className="inline" /> {m.status}</span>
            </div>
          </div>

          {/* Branch info only, lab hidden */}
          <div className="flex flex-col gap-0.5 mb-1">
            <div className="flex items-center gap-2">
              <HiLocationMarker className="text-emerald-400" size={16} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Branch:</span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold truncate">{m.branch}</span>
            </div>
          </div>

          {/* CTA Button - wider and labeled 'View Lab' */}
          <div className="mt-1 flex justify-end">
            <button
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-tr from-blue-500 via-purple-500 to-cyan-400 text-white font-semibold shadow-md hover:from-blue-600 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-blue-300 active:scale-95 transition-all duration-200 text-base w-full justify-center"
              tabIndex={0}
              aria-label={`Go to ${m.lab} ${m.branch}`}
              onClick={() => {
                if (!m.lab || !m.branch) return;
                const labSlug = toRouteSegment(m.lab);
                const branchSlug = toRouteSegment(m.branch);
                const destination = m.role === "owner"
                  ? `/${labSlug}/${branchSlug}/dashboard`
                  : `/${labSlug}/${branchSlug}`;
                router.push(destination);
              }}
              type="button"
            >
              View Lab <HiOutlineArrowRight size={18} />
            </button>
          </div>

          {/* Micro-interaction: subtle scale on hover handled by group/hover above */}
        </div>
      ))}
    </div>
  );
}
