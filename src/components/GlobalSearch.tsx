"use client";

import { useEffect, useRef, useState } from "react";
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
  onClose: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetType, setAssetType] = useState("US_STOCK");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounced search
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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, assetType]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-2xl">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stocks, crypto, ETFs, metals, currencies..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type pills */}
        <div className="flex gap-1 mt-2 px-1 flex-wrap">
          {[
            { v: "US_STOCK", l: "🇺🇸 US Stocks & ETFs" },
            { v: "STOCK", l: "🇮🇳 Indian (NSE/BSE)" },
            { v: "CRYPTO", l: "🪙 Crypto" },
            { v: "MF", l: "📈 Funds" },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => { setAssetType(t.v); setResult(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 30); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                assetType === t.v
                  ? "bg-[var(--border)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0 border border-[var(--border)]">
                  {result.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{result.name}</p>
                  <p className="text-xs text-[var(--text-muted)] tabular">{result.symbol.toUpperCase()} · {result.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--text-primary)] tabular">
                    {result.currency === "INR" ? "₹" : "$"}
                    {result.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </p>
                  <p className={`text-xs font-medium tabular flex items-center justify-end gap-0.5 ${result.change24h >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                    {result.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(result.change24h).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--border-subtle)] px-5 py-2.5 flex gap-4 text-xs text-[var(--text-muted)]">
              <span>✓ Live market data</span>
              <span>· ESC to close</span>
            </div>
          </div>
        )}

        {!result && !loading && query.length > 1 && (
          <div className="mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm text-[var(--text-muted)]">
            No results for &ldquo;{query}&rdquo; — try a ticker like MSFT, RELIANCE.NS, bitcoin
          </div>
        )}

        {/* Keyboard hints */}
        <p className="mt-3 text-center text-xs text-[var(--text-muted)] opacity-50">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded">ESC</kbd> to close
        </p>
      </div>
    </div>
  );
}
