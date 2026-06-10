"use client";

import React from "react";
import { HiMoon, HiSun } from "react-icons/hi2";
import { useTheme } from "../ThemeProvider";

export default function Topbar({ title }: { title: string }) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm flex items-center justify-between px-6 h-16 border-b">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-full border border-gray-200 p-2 text-gray-700 transition hover:bg-blue-50"
        >
          {isDarkMode ? <HiSun className="h-5 w-5 text-amber-400" /> : <HiMoon className="h-5 w-5 text-blue-700" />}
        </button>
      </div>
    </header>
  );
}
