"use client";

import React, { useState, useEffect, use } from "react";
import Sidebar from "../../../../components/Dashboard/Sidebar";

export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch } = use(params);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lab, setLab] = useState<any>(null);
  const [branchDoc, setBranchDoc] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const labRes = await fetch(`/api/labs/${slug}`);
        setLab(labRes.ok ? await labRes.json() : null);
        const branchRes = await fetch(`/api/branches/${branch}`);
        setBranchDoc(branchRes.ok ? await branchRes.json() : null);
      } catch {
        setLab(null);
        setBranchDoc(null);
      }
    })();
  }, [slug, branch]);

  return (
    <div className="min-h-screen min-w-0 bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        slug={slug}
        branch={branch}
        lab={lab}
        branchDoc={branchDoc}
      />
      <div className={collapsed ? "min-h-screen min-w-0 md:ml-20" : "min-h-screen min-w-0 md:ml-56"}>
        {/* Custom Dashboard Navbar */}
        <nav className="sticky top-0 z-40 flex h-16 min-w-0 items-center justify-between gap-2 bg-white px-3 shadow sm:gap-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-blue-700 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {/* Lab Logo */}
            <a href={`/${slug}/${branch}/`} aria-label="Go to branch home" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src={lab?.logo || "/lims.png"} alt="Lab Logo" className="h-9 w-9 shrink-0 rounded-full border object-cover sm:h-10 sm:w-10" />
            {/* Lab Name & Branch */}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-blue-700 sm:text-lg">{lab?.name || "Lab Name"}</div>
              <div className="truncate text-xs text-gray-500">{branchDoc?.branch || "Branch"}</div>
            </div>
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {/* Notification Icon */}
            <button aria-label="Notifications" className="relative hidden rounded-full p-2 hover:bg-blue-50 focus:outline-none sm:inline-flex">
              <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-xs px-1">3</span>
            </button>
            {/* User Profile */}
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label="User profile" aria-haspopup="menu">
              <img src="/avatar.png" alt="" className="h-8 w-8 rounded-full border" />
              <span className="hidden text-sm font-medium text-gray-700 lg:inline">Admin</span>
              <svg className="hidden h-4 w-4 text-gray-400 sm:block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
        </nav>
        <main className="min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}
