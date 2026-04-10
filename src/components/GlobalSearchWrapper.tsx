"use client";

import { useState } from "react";
import { Search, Command, Sun, Moon } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { useTheme } from "./ThemeProvider";

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
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center border"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <span className="text-[10px] font-black" style={{ color: "var(--text-primary)" }}>W</span>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Wealthstack
          </span>
        </div>

        <div className="w-px h-4 shrink-0" style={{ backgroundColor: "var(--border)" }} />

        {/* Search bar — this is the clickable button */}
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
            Search any asset — stocks, crypto, metals, ETFs...
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

      {/* Search modal — only rendered when open */}
      {open && <GlobalSearch onClose={() => setOpen(false)} />}
    </>
  );
}
