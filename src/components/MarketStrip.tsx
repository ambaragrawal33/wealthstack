"use client";

import { useEffect, useState } from "react";

interface StripItem {
  symbol: string;
  label: string;
  type: string;
}

const STRIP_ITEMS: StripItem[] = [
  { symbol: "^NSEI", label: "Nifty 50", type: "US_STOCK" },
  { symbol: "^BSESN", label: "Sensex", type: "US_STOCK" },
  { symbol: "^GSPC", label: "S&P 500", type: "US_STOCK" },
  { symbol: "^DJI", label: "Dow Jones", type: "US_STOCK" },
  { symbol: "^IXIC", label: "Nasdaq", type: "US_STOCK" },
  { symbol: "GOLDBEES.NS", label: "Gold (GoldBees)", type: "STOCK" },
  { symbol: "GC=F", label: "Gold Futures", type: "US_STOCK" },
  { symbol: "SI=F", label: "Silver Futures", type: "US_STOCK" },
  { symbol: "bitcoin", label: "Bitcoin", type: "CRYPTO" },
  { symbol: "ethereum", label: "Ethereum", type: "CRYPTO" },
  { symbol: "INR=X", label: "USD/INR", type: "US_STOCK" },
  { symbol: "EURUSD=X", label: "EUR/USD", type: "US_STOCK" },
];

interface Price { price: number; change: number; currency: string; }

export function MarketStrip() {
  const [prices, setPrices] = useState<Record<string, Price>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const next: Record<string, Price> = {};
      await Promise.allSettled(
        STRIP_ITEMS.map(async item => {
          try {
            const r = await fetch(`/api/search?q=${item.symbol}&type=${item.type}`);
            const d = await r.json();
            if (r.ok) next[item.symbol] = { price: d.price, change: d.change24h, currency: d.currency };
          } catch {}
        })
      );
      setPrices(p => ({ ...p, ...next }));
    };
    fetchAll();
    const iv = setInterval(fetchAll, 60000); // refresh every minute
    return () => clearInterval(iv);
  }, []);

  const items = STRIP_ITEMS.filter(i => prices[i.symbol]);

  if (!items.length) return null;

  const content = [...items, ...items]; // double for seamless loop

  return (
    <div className="border-b border-[var(--border-subtle)] overflow-hidden bg-[var(--bg)] h-9 flex items-center">
      <div className="flex market-scroll whitespace-nowrap gap-0">
        {content.map((item, idx) => {
          const p = prices[item.symbol];
          if (!p) return null;
          const isUp = p.change >= 0;
          return (
            <span key={`${item.symbol}-${idx}`} className="inline-flex items-center gap-2 px-5 text-xs border-r border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] font-medium">{item.label}</span>
              <span className="text-[var(--text-primary)] font-semibold tabular">
                {p.currency === "INR" ? "₹" : "$"}{p.price > 1000
                  ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className={`font-medium tabular ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {isUp ? "+" : ""}{p.change.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
