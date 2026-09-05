"use client"

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiMoon, HiSun } from "react-icons/hi2";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/test-orders", label: "Orders" },
  { href: "/payments", label: "Payments" },
  { href: "/patients", label: "Patients" },
  { href: "/bills", label: "Bills" },
  { href: "/expenses", label: "Expenses" },
  { href: "/eod", label: "EOD" },
  { href: "/login", label: "Logout" },
];

export default function Navbar() {
const [open, setOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  // Extract slug and branch from /[slug]/[branch]/...
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";

  // Helper to build href with slug/branch if needed
  const buildHref = (href: string) => {
    // Home should always go to /slug/branch if available
    if (href === "/" && slug && branch) return `/${slug}/${branch}`;
    // If login, don't prefix
    if (href === "/login") return href;
    // If already has slug/branch, don't double up
    if (href.startsWith(`/${slug}/${branch}`)) return href;
    // If on a slug/branch route, prefix
    if (slug && branch) return `/${slug}/${branch}${href}`;
    return href;
  };

  return (
    <nav className="bg-white shadow sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          {/* <Image src="/logo.svg" alt="App Logo" width={48} height={48} className="mb-2" /> */}
        <svg width="320" height="80" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          
        </div>
        <div className="hidden md:flex gap-6">
          {navLinks.map(link => (
            <Link key={link.href} href={buildHref(link.href)} className="hover:text-blue-700 font-medium">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-full border border-gray-200 p-2 text-blue-700 transition hover:bg-blue-50"
          >
            {isDarkMode ? <HiSun className="h-5 w-5 text-amber-400" /> : <HiMoon className="h-5 w-5" />}
          </button>
          <button
            className="md:hidden flex items-center px-2 py-1 border rounded text-blue-700 border-blue-700"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t shadow px-4 pb-4">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={buildHref(link.href)}
              className="block py-2 text-gray-700 hover:text-blue-700 font-medium"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
