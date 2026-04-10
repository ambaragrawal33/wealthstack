"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeCtxType {
  theme: Theme;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeCtxType>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted theme on client mount only
    try {
      const stored = localStorage.getItem("ws_theme") as Theme | null;
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Apply theme to root html element
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ws_theme", theme);
  }, [theme, mounted]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
