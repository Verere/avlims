import React from "react";
import Link from "next/link";

const MainNav: React.FC = () => {
  return (
    <nav className="w-full flex items-center justify-between px-4 py-3 bg-white shadow-sm fixed top-0 left-0 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" fill="url(#mainnav-logo-gradient)" />
          <path d="M20 10 L26 30 L14 30 Z" fill="white" opacity="0.95"/>
          <circle cx="20" cy="15" r="2" fill="#00C9FF"/>
          <circle cx="16" cy="27" r="1.5" fill="#0052D4"/>
          <circle cx="24" cy="27" r="1.5" fill="#00C9FF"/>
          <line x1="20" y1="15" x2="16" y2="27" stroke="#00C9FF" strokeWidth="1"/>
          <line x1="20" y1="15" x2="24" y2="27" stroke="#0052D4" strokeWidth="1"/>
          <defs>
            <linearGradient id="mainnav-logo-gradient" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1A237E"/>
              <stop offset="1" stopColor="#00C9FF"/>
            </linearGradient>
          </defs>
        </svg>
        <span className="font-bold text-xl text-blue-900 tracking-wide select-none hidden sm:inline">av<span className="text-blue-400">lims</span></span>
      </Link>
      {/* Login Button */}
      <Link href="/login">
        <button className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm shadow-sm">
          Login
        </button>
      </Link>
    </nav>
  );
};

export default MainNav;
