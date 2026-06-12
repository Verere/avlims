'use client'
import React, { useState } from "react";
import Link from "next/link";

function buildNavItems(slug: string, branch: string) {
  return [
    { label: "Overview", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5 0h-6a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg>, href: `/${slug}/${branch}/dashboard` },
    { label: "Test Orders", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>, href: `/${slug}/${branch}/dashboard/test-orders` },
    { label: "Results", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>, href: `/${slug}/${branch}/dashboard/results` },
    { label: "Billing", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01" /></svg>, href: `/${slug}/${branch}/dashboard/billing` },
    { label: "Payments", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" /><path d="M3 10h18" /></svg>, href: `/${slug}/${branch}/dashboard/payments` },
    { label: "End of Day", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>, href: `/${slug}/${branch}/dashboard/end-of-day` },
    { label: "Referrer Bonus", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01" /></svg>, href: `/${slug}/${branch}/dashboard/referrer-bonus` },
    { label: "Expenses", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M7 6V4m10 2V4M6 10h12v10H6z" /></svg>, href: `/${slug}/${branch}/expenses` },
  {
    label: "Patients",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 010 7.75" /></svg>,
    href: `/${slug}/${branch}/dashboard/patients`,
    subNav: [
      { label: "Patient Lists", href: `/${slug}/${branch}/dashboard/patients`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> },
      { label: "Add Patient", href: `/${slug}/${branch}/dashboard/add-patient`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> },
    ],
  },
  
  {
    label: "Tests",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" /></svg>,
    href: `/${slug}/${branch}/dashboard/tests`,
    subNav: [
      { label: "Tests", href: `/${slug}/${branch}/dashboard/tests`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg> },
      { label: "Panel", href: `/${slug}/${branch}/dashboard/panels`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg> },
      { label: "Result Templates", href: `/${slug}/${branch}/dashboard/result-templates`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg> },
      { label: "Findings", href: `/${slug}/${branch}/dashboard/findings`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" /></svg> },
      { label: "Add Result Template", href: `/${slug}/${branch}/dashboard/add-result-template`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /><rect x="4" y="4" width="16" height="16" rx="2" /></svg> },
      { label: "Add Findings", href: `/${slug}/${branch}/dashboard/add-findings`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 6h10a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1z" /></svg> },
      { label: "Test Categories", href: `/${slug}/${branch}/dashboard/test-categories`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg> },
      { label: "Add Test", href: `/${slug}/${branch}/dashboard/add-test`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg> },
      { label: "Add Panel", href: `/${slug}/${branch}/dashboard/add-panel`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg> },
      { label: "Add Test Category", href: `/${slug}/${branch}/dashboard/add-test-category`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></svg> },
      { label: "Add Sub Category", href: `/${slug}/${branch}/dashboard/add-sub-category`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M16 12H8" /></svg> },
    ],
  },
  
  {
    label: "Referrers",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 010 7.75" /></svg>,
    href: `/${slug}/${branch}/dashboard/referrers`,
    subNav: [
      { label: "Refferers", href: `/${slug}/${branch}/dashboard/referrers`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 20h5v-2a4 4 0 00-3-3.87" /></svg> },
      { label: "Ref. Clinics", href: `/${slug}/${branch}/dashboard/ref-clinics`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg> },
      { label: "Add Reffers", href: `/${slug}/${branch}/dashboard/add-referrer`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg> },
      { label: "Add Ref. Clinic", href: `/${slug}/${branch}/dashboard/add-ref-clinic`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></svg> },
    ],
  },

  {
    label: "Users",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    href: `/${slug}/${branch}/dashboard/users`,
    subNav: [
      { label: "Users List", href: `/${slug}/${branch}/dashboard/users`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 6a3 3 0 11-6 0 3 3 0 016 0zM6.5 20a2.5 2.5 0 00-2.5-2.5h5" /></svg> },
      { label: "Add User", href: `/${slug}/${branch}/dashboard/add-user`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
      { label: "Roles", href: `/${slug}/${branch}/dashboard/roles`, icon: <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 1112 2.944a11.954 11.954 0 018.618 3.04A12.02 12.02 0 0121 12z" /></svg> },
    ],
  },
  
    { label: "Reports", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>, href: `/${slug}/${branch}/dashboard/reports` },
    { label: "Settings", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 0V6m0 4v2m0 4v2m0 0h.01" /></svg>, href: `/${slug}/${branch}/dashboard/settings` },

  ];
}

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  slug: string;
  branch: string;
  lab?: any;        // refine later if you want
  branchDoc?: any;  // refine later if you want
  labLogoUrl?: string; // refine later if you want
};

export default function Sidebar({ collapsed, onToggle, slug, branch, lab, branchDoc, labLogoUrl }: SidebarProps) {
  const navItems = buildNavItems(slug, branch);
  const [openSubNav, setOpenSubNav] = useState<string | null>(null);
  const activeHref = navItems[0]?.href;

  const handleSubNavToggle = (href: string) => {
    setOpenSubNav(prev => (prev === href ? null : href));
  };

  return (
    <aside
      className={`bg-white shadow-md h-screen fixed top-0 left-0 z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-56'}`}
      aria-label="Sidebar"
      style={{ maxHeight: '100vh' }}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <span className="font-bold text-blue-700 text-xl">{collapsed ? '' : 
          <div className="flex items-center gap-2">
            {/* If lab logo is available, render it here. Otherwise, show project logo SVG. */}
            {/* TODO: Replace 'labLogoUrl' with actual lab logo prop or state if available */}
            {typeof labLogoUrl !== 'undefined' && labLogoUrl ? (
              <img src={labLogoUrl} alt="Lab Logo" width={48} height={48} className="mb-2" />
            ) : (
              <svg width="150" height="80" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                  <circle cx="32" cy="40" r="24" fill="url(#grad1)" />
                  <path d="M32 20 L44 60 L20 60 Z" fill="white" opacity="0.95"/>
                  <circle cx="32" cy="28" r="3" fill="#00C9FF"/>
                  <circle cx="24" cy="52" r="2.5" fill="#0052D4"/>
                  <circle cx="40" cy="52" r="2.5" fill="#00C9FF"/>
                  <line x1="32" y1="28" x2="24" y2="52" stroke="#00C9FF" strokeWidth="1.5"/>
                  <line x1="32" y1="28" x2="40" y2="52" stroke="#0052D4" strokeWidth="1.5"/>
                </g>
                <text x="70" y="54" fontFamily="Inter, Poppins, Arial, sans-serif" fontSize="44" fontWeight="600" fill="#1A237E" letterSpacing="1">
                  av
                  <tspan fill="#00C9FF">lims</tspan>
                </text>
                <path d="M92 38 Q94 54 98 38" stroke="#00C9FF" strokeWidth="2" fill="none"/>
                <defs>
                  <linearGradient id="grad1" x1="8" y1="16" x2="56" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1A237E"/>
                    <stop offset="1" stopColor="#00C9FF"/>
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        }</span>
        <button
          className="p-2 rounded hover:bg-gray-100 focus:outline-none"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {/* Sidebar collapse/expand icon: left arrow when expanded, right arrow when collapsed */}
          {collapsed ? (
            // Expand icon (right arrow)
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          ) : (
            // Collapse icon (left arrow)
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          )}
        </button>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(item => (
          <div key={item.href} className="w-full">
            <div className="flex items-center">
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all group focus:outline-none focus:ring-2 focus:ring-blue-200 ${activeHref === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                tabIndex={0}
                aria-current={activeHref === item.href ? 'page' : undefined}
              >
                <span className="text-xl">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
              {/* Show collapse/expand icon if subNav exists and sidebar is expanded */}
              {!collapsed && item.subNav && (
                <button
                  className="ml-auto p-1 focus:outline-none"
                  onClick={() => handleSubNavToggle(item.href)}
                  aria-label={openSubNav === item.href ? 'Collapse sub navigation' : 'Expand sub navigation'}
                >
                  {/* Chevron icon, rotates if open */}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${openSubNav === item.href ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            {/* Render subNav if present, sidebar is expanded, and this subNav is open */}
            {!collapsed && item.subNav && openSubNav === item.href && (
              <div className="ml-10 flex flex-col gap-1 mt-1">
                {item.subNav.map(sub => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className="flex items-center text-sm text-gray-600 hover:text-blue-700 py-1 px-2 rounded transition-all"
                  >
                    {sub.icon && <span className="mr-2">{sub.icon}</span>}
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
