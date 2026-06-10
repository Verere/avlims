"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeContextValue = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(isDarkMode: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("app-theme");
    const nextDarkMode = storedTheme === "dark";
    setIsDarkMode(nextDarkMode);
    applyTheme(nextDarkMode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("app-theme", isDarkMode ? "dark" : "light");
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  const value = useMemo(
    () => ({
      isDarkMode,
      toggleTheme: () => setIsDarkMode((current) => !current),
      setIsDarkMode,
    }),
    [isDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}