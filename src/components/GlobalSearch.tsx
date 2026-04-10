"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";

interface SearchResult {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change24h: number;
  type: string;
}

interface GlobalSearchProps {
  onSelectAsset?: (asset: SearchResult) => void;
}

export function GlobalSearch({ onSelectAsset }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetType, setAssetType] = useState("US_STOCK");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd/Ctrl + K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResult(null); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=${assetType}`);
        const json = await res.json();
        if (res.ok) setResult(json);
        else setResult(null);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [query, assetType]);

  const handleSelect = useCallback((r: SearchResult) => {
    onSelectAsset?.(r);
    setOpen(false);
    setQuery("");
    setResult(null);
  }, [onSelectAsset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 shadow-2xl">
          <Search className="w-4 h-4 text-[#52525b] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any asset — stocks, crypto, metals, ETFs, currencies..."
            className="flex-1 bg-transparent text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#52525b] animate-spin shrink-0" />}
          <button onClick={() => setOpen(false)} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-1 mt-2 px-1">
          {[
            { v: "CRYPTO", l: "Crypto" },
            { v: "US_STOCK", l: "US Stocks" },
            { v: "STOCK", l: "Indian" },
            { v: "MF", l: "Funds" },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setAssetType(t.v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                assetType === t.v
                  ? "bg-[#27272a] text-[#fafafa]"
                  : "text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-2 bg-[#111113] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => handleSelect(result)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#18181b] transition-colors group"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-9 h-9 rounded-lg bg-[#27272a] flex items-center justify-center text-xs font-bold text-[#a1a1aa] shrink-0">
                  {result.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#fafafa]">{result.name}</p>
                  <p className="text-xs text-[#71717a] tabular">{result.symbol.toUpperCase()} · {result.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#fafafa] tabular">
                    {result.currency === "INR" ? "₹" : "$"}{result.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </p>
                  <p className={`text-xs font-medium tabular flex items-center justify-end gap-0.5 ${result.change24h >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {result.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(result.change24h).toFixed(2)}%
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#52525b] group-hover:text-[#a1a1aa] transition-colors" />
              </div>
            </button>
            <div className="border-t border-[#1f1f23] px-5 py-2.5 flex gap-4 text-xs text-[#52525b]">
              <span>↵ to view details</span>
              <span>· ESC to close</span>
            </div>
          </div>
        )}

        {!result && !loading && query.length > 0 && (
          <div className="mt-2 bg-[#111113] border border-[#27272a] rounded-xl px-5 py-4 text-sm text-[#52525b]">
            No results for "{query}" — try a ticker like MSFT, RELIANCE.NS, or bitcoin
          </div>
        )}

        {/* Keyboard hint */}
        {!query && (
          <p className="mt-3 text-center text-xs text-[#3f3f46]">
            Press <kbd className="px-1.5 py-0.5 bg-[#27272a] rounded text-[#71717a]">ESC</kbd> to close
          </p>
        )}
      </div>
    </div>
  );
}
