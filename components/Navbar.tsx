"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { HiMoon, HiSun } from "react-icons/hi2";
import { toast } from "react-toastify";
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
  const [adminAccess, setAdminAccess] = useState<{ scope: string; allowed: boolean | null } | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const pathname = usePathname();
  // Extract slug and branch from /[slug]/[branch]/...
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const slug = pathParts[0] || "";
  const branch = pathParts[1] || "";
  const adminScope = `${slug}/${branch}`;
  const adminDashboardUrl = slug && branch ? `/${slug}/${branch}/dashboard` : "/dashboard";
  const displayedNavLinks = [
    ...navLinks.slice(0, -1),
    { href: adminDashboardUrl, label: "Admin" },
    navLinks[navLinks.length - 1],
  ];
  const canAccessAdmin = adminAccess?.scope === adminScope ? adminAccess.allowed : null;

  useEffect(() => {
    let isMounted = true;
    if (!slug || !branch) return () => { isMounted = false; };

    const query = new URLSearchParams({ labSlug: slug, branchSlug: branch });
    fetch(`/api/session/admin-access?${query.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to verify admin access");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setAdminAccess({ scope: adminScope, allowed: data?.isAdmin === true });
      })
      .catch(() => {
        if (isMounted) {
          setAdminAccess({ scope: adminScope, allowed: null });
          toast.error("Unable to verify admin access");
        }
      });

    return () => { isMounted = false; };
  }, [slug, branch, adminScope]);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string, closeMobile = false) => {
    if (href === "/login") {
      event.preventDefault();
      if (closeMobile) setOpen(false);
      void signOut({ callbackUrl: "/login" });
      return;
    }

    if (href === adminDashboardUrl && canAccessAdmin !== true) {
      event.preventDefault();
      if (canAccessAdmin === false) toast.error("Admin only");
      else toast.info("Checking admin access");
      return;
    }
    if (closeMobile) setOpen(false);
  };

  // Helper to build href with slug/branch if needed
  const buildHref = (href: string) => {
    if (href.startsWith("https://")) return href;
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
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          {/* <Image src="/logo.svg" alt="App Logo" width={48} height={48} className="mb-2" /> */}
        <svg className="h-10 w-36 shrink-0 sm:w-44" width="320" height="80" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 xl:flex 2xl:gap-5">
          {displayedNavLinks.map(link => (
            <Link
              key={link.href}
              href={buildHref(link.href)}
              className="hover:text-blue-700 font-medium"
              onClick={(event) => handleNavClick(event, link.href)}
            >
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
            className="inline-flex shrink-0 items-center rounded border border-blue-700 px-2 py-1 text-blue-700 xl:hidden"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t bg-white px-4 pb-4 shadow xl:hidden">
          {displayedNavLinks.map(link => (
            <Link
              key={link.href}
              href={buildHref(link.href)}
              className="block py-2 text-gray-700 hover:text-blue-700 font-medium"
              onClick={(event) => handleNavClick(event, link.href, true)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
