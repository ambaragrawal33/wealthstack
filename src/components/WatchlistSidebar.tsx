"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Loader2, TrendingUp, TrendingDown, Search, Bookmark, Trash2 } from "lucide-react";

const WATCHLIST_KEY = "wealthstack_watchlist";

interface WatchItem {
  symbol: string;
  name: string;
  type: string;
  currency: string;
}

interface LivePrice {
  price: number;
  change: number;
}

function fmt(n: number, currency: string) {
  if (currency === "INR") return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

export function WatchlistSidebar() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState("US_STOCK");
  const [searchResult, setSearchResult] = useState<WatchItem & { price: number; change: number } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (next: WatchItem[]) => {
    setItems(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  };

  // Poll live prices for watchlist
  useEffect(() => {
    if (!items.length) return;

    const fetchPrices = async () => {
      const yahooSymbols = items.filter(i => i.type !== "CRYPTO").map(i => i.symbol);
      const cryptoIds = items.filter(i => i.type === "CRYPTO").map(i => i.symbol);
      
      const next: Record<string, LivePrice> = {};

      // Fetch each individually
      for (const sym of yahooSymbols) {
        try {
          const r = await fetch(`/api/search?q=${sym}&type=${items.find(i=>i.symbol===sym)?.type || "US_STOCK"}`);
          const d = await r.json();
          if (r.ok) next[sym] = { price: d.price, change: d.change24h };
        } catch {}
      }
      for (const id of cryptoIds) {
        try {
          const r = await fetch(`/api/search?q=${id}&type=CRYPTO`);
          const d = await r.json();
          if (r.ok) next[id] = { price: d.price, change: d.change24h };
        } catch {}
      }
      
      setPrices(p => ({ ...p, ...next }));
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [items]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResult(null); return; }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=${assetType}`);
        const json = await res.json();
        if (res.ok) setSearchResult({ ...json });
        else setSearchResult(null);
      } catch {
        setSearchResult(null);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, [query, assetType]);

  const addToWatchlist = (item: WatchItem) => {
    if (items.some(i => i.symbol === item.symbol)) return;
    persist([...items, item]);
    setAdding(false);
    setQuery("");
    setSearchResult(null);
  };

  const removeFromWatchlist = (symbol: string) => {
    persist(items.filter(i => i.symbol !== symbol));
  };

  return (
    <aside className="w-[220px] shrink-0 h-full flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Watchlist</span>
          </div>
          <button
            onClick={() => { setAdding(a => !a); setQuery(""); setSearchResult(null); }}
            className="w-5 h-5 flex items-center justify-center rounded bg-[var(--border)] hover:bg-[var(--border)] text-[var(--text-secondary)] transition-colors"
          >
            {adding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Add panel */}
      {adding && (
        <div className="px-3 py-3 border-b border-[var(--border-subtle)] space-y-2">
          <div className="flex gap-1 flex-wrap">
            {[
              { v: "US_STOCK", l: "US" },
              { v: "STOCK", l: "IN" },
              { v: "CRYPTO", l: "Crypto" },
              { v: "MF", l: "Fund" },
            ].map(t => (
              <button
                key={t.v}
                onClick={() => setAssetType(t.v)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  assetType === t.v ? "bg-[var(--border)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2 py-1.5">
            <Search className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. MSFT, bitcoin..."
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none min-w-0"
            />
            {searchLoading && <Loader2 className="w-3 h-3 text-[var(--text-muted)] animate-spin shrink-0" />}
          </div>

          {searchResult && (
            <button
              onClick={() => addToWatchlist({ symbol: searchResult.symbol, name: searchResult.name, type: assetType, currency: searchResult.currency })}
              className="w-full flex items-center justify-between bg-[var(--bg-elevated)] hover:bg-[var(--border)] border border-[var(--border)] rounded-lg px-3 py-2 transition-colors group"
            >
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{searchResult.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{searchResult.symbol.toUpperCase()}</p>
              </div>
              <Plus className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--green)] shrink-0 transition-colors" />
            </button>
          )}
        </div>
      )}

      {/* Watchlist items */}
      <div className="flex-1 overflow-y-auto py-1">
        {items.length === 0 && !adding && (
          <div className="px-4 py-8 text-center">
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Add tickers to track prices here. Click + above.
            </p>
          </div>
        )}

        {items.map(item => {
          const lp = prices[item.symbol];
          const isUp = (lp?.change ?? 0) >= 0;

          return (
            <div
              key={item.symbol}
              className="group flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-surface)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.symbol.toUpperCase()}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{item.name}</p>
              </div>
              <div className="ml-2 shrink-0 flex items-center gap-2">
                {lp ? (
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular text-[var(--text-primary)]">
                      {item.currency === "INR" ? "₹" : "$"}{lp.price > 1000
                        ? lp.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : lp.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] font-medium tabular ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                      {isUp ? "+" : ""}{lp.change.toFixed(2)}%
                    </p>
                  </div>
                ) : (
                  <div className="w-12 h-7 shimmer rounded" />
                )}
                <button
                  onClick={() => removeFromWatchlist(item.symbol)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <p className="text-[10px] text-[var(--text-muted)]">{items.length} tracked</p>
      </div>
    </aside>
  );
}
