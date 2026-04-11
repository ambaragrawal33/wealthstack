"use client";

import { useState } from "react";
import { Search, Command, Sun, Moon } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { useTheme } from "./ThemeProvider";

function FolioLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded square bg */}
      <rect width="32" height="32" rx="8" fill="#2563eb" />

      {/* Rising bar chart — 3 bars */}
      <rect x="5" y="19" width="5" height="8" rx="1.5" fill="white" fillOpacity="0.45" />
      <rect x="13" y="13" width="5" height="14" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="21" y="6" width="5" height="21" rx="1.5" fill="white" />

      {/* Rising line on top */}
      <polyline
        points="7.5,19 15.5,13 23.5,6"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      {/* Dot at peak */}
      <circle cx="23.5" cy="6" r="1.8" fill="white" />
    </svg>
  );
}

export function GlobalSearchWrapper() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Top navbar */}
      <header
        className="shrink-0 flex items-center gap-4 px-5 h-12 border-b"
        style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <FolioLogo size={26} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Folio
          </span>
        </div>

        <div className="w-px h-4 shrink-0" style={{ backgroundColor: "var(--border)" }} />

        {/* Search bar */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
          <span className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Search any asset — stocks, crypto, metals, ETFs, currencies...
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)" }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              : <Moon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            }
          </button>
        </div>
      </header>

      {/* Search modal */}
      {open && <GlobalSearch onClose={() => setOpen(false)} />}
    </>
  );
}
