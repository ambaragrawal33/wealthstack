"use client";

import { useState } from "react";
import { Search, Command } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

export function GlobalSearchWrapper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top navbar */}
      <header className="shrink-0 flex items-center gap-4 px-5 h-12 border-b border-[#1f1f23] bg-[#09090b]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-[#27272a] border border-[#3f3f46] flex items-center justify-center">
            <span className="text-[10px] font-black text-[#fafafa]">W</span>
          </div>
          <span className="text-sm font-semibold text-[#fafafa] tracking-tight">Wealthstack</span>
        </div>

        <div className="w-px h-4 bg-[#27272a] shrink-0" />

        {/* Search bar */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 bg-[#111113] border border-[#27272a] hover:border-[#3f3f46] rounded-lg transition-colors text-left group"
        >
          <Search className="w-3.5 h-3.5 text-[#52525b] shrink-0" />
          <span className="flex-1 text-xs text-[#52525b] group-hover:text-[#71717a] transition-colors">
            Search any asset — stocks, crypto, metals, ETFs...
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 bg-[#27272a] rounded text-[10px] text-[#3f3f46] flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </button>
      </header>

      {/* Search modal */}
      {open && <GlobalSearch onSelectAsset={() => setOpen(false)} />}
      {/* Also handle Cmd+K from global search */}
    </>
  );
}
