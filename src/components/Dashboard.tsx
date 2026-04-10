"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { HoldingsInput } from "./HoldingsInput";
import { AdvancedNetWorthChart } from "./charts/AdvancedNetWorthChart";
import { AllocationChart } from "./charts/AllocationChart";
import { TransactionsTable } from "./views/TransactionsTable";
import { PerformanceAnalytics } from "./views/PerformanceAnalytics";
import { calcAssetCurrentValueINR, calcAsset24hChange } from "@/lib/portfolioEngine";
import {
  LayoutDashboard, ListOrdered, BarChart2, Plus, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, RefreshCw, Settings, ChevronRight
} from "lucide-react";

type Tab = "DASHBOARD" | "TRANSACTIONS" | "ANALYTICS" | "SETTINGS";

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function Stat({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean }) {
  return (
    <div className="px-6 py-5 border-r border-[#1f1f23] last:border-r-0 min-w-0">
      <p className="text-[11px] text-[#52525b] uppercase tracking-wider mb-2 font-medium">{label}</p>
      <p className="text-lg font-semibold text-[#fafafa] tabular truncate">{value}</p>
      {sub !== undefined && (
        <p className={`text-xs font-medium tabular mt-0.5 ${up ? "text-[#22c55e]" : up === false ? "text-[#ef4444]" : "text-[#71717a]"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function Dashboard() {
  const dbAssets = usePortfolioStore(s => s.dbAssets);
  const setAssets = usePortfolioStore(s => s.setAssets);
  const prices = usePortfolioStore(s => s.prices);
  const setPricesData = usePortfolioStore(s => s.setPricesData);
  const usdInrRate = usePortfolioStore(s => s.usdInrRate) ?? 84;

  const [tab, setTab] = useState<Tab>("DASHBOARD");
  const [syncing, setSyncing] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Load portfolio
  useEffect(() => {
    fetch("/api/portfolio")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAssets(d); })
      .catch(console.error);
  }, [setAssets]);

  // Live price polling
  useEffect(() => {
    if (!dbAssets.length) return;
    const payload = { assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency })) };
    const poll = async () => {
      setSyncing(true);
      try {
        const r = await fetch("/api/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (d.prices) setPricesData(d.prices, d.usdInrRate);
      } catch {}
      finally { setSyncing(false); }
    };
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [dbAssets, setPricesData]);

  const { totalINR, change24h, invested } = useMemo(() => {
    let tv = 0, cv = 0, inv = 0;
    for (const a of dbAssets) {
      const p = prices[a.symbol];
      if (p && a.holdings > 0) {
        tv += calcAssetCurrentValueINR(a.holdings, p.nativePrice, p.currency, usdInrRate);
        cv += calcAssetCurrentValueINR(a.holdings, calcAsset24hChange(p.nativePrice, p.usd_24h_change, p.currency, usdInrRate), p.currency, 1);
        inv += calcAssetCurrentValueINR(a.holdings, a.averagePrice, a.currency, usdInrRate);
      } else if (a.holdings > 0) {
        const v = calcAssetCurrentValueINR(a.holdings, a.averagePrice, a.currency, usdInrRate);
        tv += v; inv += v;
      }
    }
    return { totalINR: tv, change24h: cv, invested: inv };
  }, [dbAssets, prices, usdInrRate]);

  const pnl = totalINR - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const changePct = totalINR > 0 ? (change24h / (totalINR - change24h)) * 100 : 0;
  const dayUp = change24h >= 0;
  const overallUp = pnl >= 0;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "DASHBOARD", label: "Overview", icon: LayoutDashboard },
    { id: "TRANSACTIONS", label: "Transactions", icon: ListOrdered },
    { id: "ANALYTICS", label: "Analytics", icon: BarChart2 },
    { id: "SETTINGS", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-[#09090b]">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-0 h-12 border-b border-[#1f1f23]">
        <nav className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-[#18181b] text-[#fafafa]"
                  : "text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#111113]"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${syncing ? "text-amber-400" : "text-[#22c55e]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${syncing ? "bg-amber-400 animate-pulse" : "bg-[#22c55e]"}`} />
            {syncing ? "Syncing" : "Live"}
          </div>
          <button
            onClick={() => setShowAddPanel(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] text-xs font-medium text-[#fafafa] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Holding
          </button>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "DASHBOARD" && (
          <div className="flex flex-col">
            {/* Stats row */}
            <div className="shrink-0 flex border-b border-[#1f1f23] overflow-x-auto">
              <Stat label="Net Worth" value={fmt(totalINR)} />
              <Stat
                label="Day Change"
                value={`${dayUp ? "+" : ""}${fmt(change24h)}`}
                sub={`${dayUp ? "+" : ""}${changePct.toFixed(2)}%`}
                up={dayUp}
              />
              <Stat
                label="Unrealized P&L"
                value={`${overallUp ? "+" : ""}${fmt(pnl)}`}
                sub={`${overallUp ? "+" : ""}${pnlPct.toFixed(2)}% all time`}
                up={overallUp}
              />
              <Stat label="Invested" value={fmt(invested)} />
              <Stat label="USD/INR" value={`₹${usdInrRate.toFixed(2)}`} sub="live fx rate" />
              <Stat label="Holdings" value={`${dbAssets.length} assets`} />
            </div>

            {/* Main content */}
            <div className="flex flex-1 min-h-0">
              {/* Left: chart + table */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                {/* Chart */}
                <div className="p-6 border-b border-[#1f1f23]">
                  <AdvancedNetWorthChart />
                </div>

                {/* Holdings table */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[#fafafa]">Holdings</h2>
                    <span className="text-xs text-[#52525b]">{dbAssets.length} positions</span>
                  </div>

                  {dbAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[#111113] border border-[#27272a] flex items-center justify-center mb-4">
                        <Plus className="w-5 h-5 text-[#52525b]" />
                      </div>
                      <p className="text-sm text-[#71717a] mb-1">No holdings yet</p>
                      <p className="text-xs text-[#3f3f46]">Click "Add Holding" to start building your portfolio</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1f1f23]">
                            {["Asset", "Holdings", "Live Price", "Value (INR)", "Day", "P&L"].map(h => (
                              <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#52525b] font-medium pb-3 pr-6 last:pr-0">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dbAssets.map(asset => {
                            const p = prices[asset.symbol];
                            const valueINR = p
                              ? calcAssetCurrentValueINR(asset.holdings, p.nativePrice, p.currency, usdInrRate)
                              : calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
                            const costINR = calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
                            const pnlRow = valueINR - costINR;
                            const pnlRowPct = costINR > 0 ? (pnlRow / costINR) * 100 : 0;
                            const dayPct = p?.usd_24h_change ?? 0;
                            const dayUp = dayPct >= 0;
                            const gainUp = pnlRow >= 0;

                            return (
                              <tr key={asset.id} className="border-b border-[#1a1a1a] hover:bg-[#111113] transition-colors group">
                                <td className="py-3.5 pr-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[10px] font-bold text-[#71717a] shrink-0">
                                      {asset.symbol.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-[#fafafa] truncate text-xs">{asset.symbol.toUpperCase()}</p>
                                      <p className="text-[10px] text-[#52525b] truncate max-w-[120px]">{asset.name}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 pr-6 text-xs text-[#a1a1aa] tabular">{asset.holdings.toFixed(4)}</td>
                                <td className="py-3.5 pr-6 text-xs text-[#fafafa] tabular font-medium">
                                  {p ? (
                                    <>
                                      {asset.currency === "INR" ? "₹" : "$"}
                                      {p.nativePrice > 1000
                                        ? p.nativePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                        : p.nativePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </>
                                  ) : <span className="text-[#3f3f46]">—</span>}
                                </td>
                                <td className="py-3.5 pr-6 text-xs text-[#fafafa] tabular font-semibold">
                                  {fmt(valueINR)}
                                </td>
                                <td className="py-3.5 pr-6">
                                  <span className={`text-xs font-medium tabular ${dayUp ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                                    {dayUp ? "+" : ""}{dayPct.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="py-3.5">
                                  <div className={`text-xs font-medium tabular ${gainUp ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                                    <span>{gainUp ? "+" : ""}{fmt(pnlRow)}</span>
                                    <span className="text-[10px] ml-1 opacity-70">({gainUp ? "+" : ""}{pnlRowPct.toFixed(1)}%)</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: allocation */}
              {dbAssets.length > 0 && (
                <div className="w-[260px] shrink-0 border-l border-[#1f1f23] flex flex-col">
                  <div className="p-5 border-b border-[#1f1f23]">
                    <p className="text-[11px] uppercase tracking-wider text-[#52525b] font-medium mb-4">Allocation</p>
                    <AllocationChart />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "TRANSACTIONS" && (
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[#fafafa] mb-6">Transaction History</h2>
            <TransactionsTable />
          </div>
        )}

        {tab === "ANALYTICS" && (
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[#fafafa] mb-2">Performance Analytics</h2>
            <p className="text-xs text-[#52525b] mb-6">Breakdown of your portfolio's returns and risk profile.</p>
            <PerformanceAnalytics />
          </div>
        )}

        {tab === "SETTINGS" && (
          <div className="p-6 max-w-lg">
            <h2 className="text-sm font-semibold text-[#fafafa] mb-6">Settings</h2>
            <div className="space-y-3">
              {[
                { label: "Export portfolio to CSV", sub: "Download all transactions and holdings" },
                { label: "Currency display", sub: "Base currency: INR (Indian Rupee)" },
                { label: "Price refresh interval", sub: "Currently: every 15 seconds" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-[#111113] border border-[#1f1f23] rounded-xl hover:border-[#27272a] transition-colors cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-[#fafafa]">{item.label}</p>
                    <p className="text-xs text-[#52525b] mt-0.5">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#3f3f46] group-hover:text-[#71717a] transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Holding Slide Panel */}
      {showAddPanel && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[380px] bg-[#111113] border-l border-[#27272a] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#1f1f23]">
              <h3 className="text-sm font-semibold text-[#fafafa]">Add Holding</h3>
              <button onClick={() => setShowAddPanel(false)} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                ✕
              </button>
            </div>
            <div className="p-4">
              <HoldingsInput />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
