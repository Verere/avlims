"use client";

import React, { useState, useEffect, use } from "react";
import Sidebar from "../../../../components/Dashboard/Sidebar";
import { HiMoon, HiSun } from "react-icons/hi2";
import { useTheme } from "../../../../components/ThemeProvider";

export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch } = use(params);
  const [collapsed, setCollapsed] = useState(false);
  const [lab, setLab] = useState<any>(null);
  const [branchDoc, setBranchDoc] = useState<any>(null);
  const { isDarkMode, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} slug={slug} branch={branch} lab={lab} branchDoc={branchDoc} />
      <div className={collapsed ? "flex-1 ml-20" : "flex-1 ml-56"}>
        {/* Custom Dashboard Navbar */}
        <nav className="bg-white shadow sticky top-0 z-40 flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3" onClick={() => window.location.href = `/${slug}/${branch}/`}>
            {/* Lab Logo */}
            <img src={lab?.logo || "/lims.png"}  alt="Lab Logo" className="h-10 w-10 rounded-full object-cover border" />
            {/* Lab Name & Branch */}
            <div>
              <div className="font-bold text-blue-700 text-lg">{lab?.name || "Lab Name"}</div>
              <div className="text-xs text-gray-500">{branchDoc?.branch || "Branch"}</div>
            </div>
          </div>
         
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search..."
                className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
                aria-label="Search"
              />
              <svg className="absolute right-2 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-full border border-gray-200 p-2 text-gray-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {isDarkMode ? <HiSun className="h-5 w-5 text-amber-400" /> : <HiMoon className="h-5 w-5 text-blue-700" />}
            </button>
            {/* Notification Icon */}
            <button className="relative p-2 rounded-full hover:bg-blue-50 focus:outline-none">
              <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-xs px-1">3</span>
            </button>
            {/* User Profile */}
            <div className="flex items-center gap-2 cursor-pointer">
          <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200" aria-haspopup="true" aria-expanded="false">
            <img src="/avatar.png" alt="User avatar" className="w-8 h-8 rounded-full border" />
            <span className="hidden md:inline text-sm font-medium text-gray-700">Admin</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
       
        </div>
          </div>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
