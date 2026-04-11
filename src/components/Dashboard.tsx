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
  LayoutDashboard, ListOrdered, BarChart2, Plus,
  TrendingUp, TrendingDown, Settings, ChevronRight,
  Sun, Moon, Download, Clock, DollarSign,
  Pencil, Trash2, Check, X, Loader2
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { AssetLogo } from "./AssetLogo";

type Tab = "DASHBOARD" | "TRANSACTIONS" | "ANALYTICS" | "SETTINGS";
type Segment = "ALL" | "INDIA" | "US" | "CRYPTO";
type Currency = "INR" | "USD";

const SEGMENTS: { id: Segment; label: string; flag: string; types: string[]; defaultCurrency: Currency }[] = [
  { id: "ALL",    label: "Total Portfolio", flag: "🌍", types: ["STOCK","US_STOCK","CRYPTO","MF","OTHER"], defaultCurrency: "INR" },
  { id: "INDIA",  label: "Indian Stocks",   flag: "🇮🇳", types: ["STOCK","MF"],                          defaultCurrency: "INR" },
  { id: "US",     label: "US Stocks",       flag: "🇺🇸", types: ["US_STOCK"],                             defaultCurrency: "USD" },
  { id: "CRYPTO", label: "Crypto",          flag: "🪙", types: ["CRYPTO"],                               defaultCurrency: "USD" },
];


function fmt(n: number, currency: Currency = "INR"): string {
  if (currency === "USD") {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function Stat({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean }) {
  return (
    <div className="px-5 py-4 border-r border-[var(--border-subtle)] last:border-r-0 min-w-0">
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-medium">{label}</p>
      <p className="text-base font-semibold text-[var(--text-primary)] tabular truncate">{value}</p>
      {sub !== undefined && (
        <p className={`text-xs font-medium tabular mt-0.5 ${up ? "text-[var(--green)]" : up === false ? "text-[var(--red)]" : "text-[var(--text-muted)]"}`}>
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
  const [segment, setSegment] = useState<Segment>("ALL");
  const [segCurrency, setSegCurrency] = useState<Currency>("INR");
  const [pollInterval, setPollInterval] = useState(15);
  const { theme, toggle: toggleTheme } = useTheme();
  const [editState, setEditState] = useState<{ id: string; holdings: string } | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from portfolio?`)) return;
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data);
    } catch (e: any) { alert("Delete failed: " + e.message); }
  };

  const handleEditSave = async () => {
    if (!editState) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editState.id, holdings: parseFloat(editState.holdings) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data);
      setEditState(null);
    } catch (e: any) { alert("Update failed: " + e.message); }
    finally { setEditLoading(false); }
  };

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

  // When segment changes, reset currency to the segment's default
  const prevSegment = useState<Segment>("ALL")[0];
  useEffect(() => {
    const seg = SEGMENTS.find(s => s.id === segment);
    if (seg) setSegCurrency(seg.defaultCurrency);
  }, [segment]);

  // Filter assets by segment
  const segmentAssets = useMemo(() => {
    const seg = SEGMENTS.find(s => s.id === segment);
    if (!seg || segment === "ALL") return dbAssets;
    return dbAssets.filter(a => seg.types.includes(a.type));
  }, [dbAssets, segment]);

  // Compute stats for current segment in the chosen display currency
  const segStats = useMemo(() => {
    let tv = 0, cv = 0, inv = 0;
    for (const a of segmentAssets) {
      const p = prices[a.symbol];
      const nativePrice = p ? p.nativePrice : a.averagePrice;
      const nat24hChg = p ? calcAsset24hChange(p.nativePrice, p.usd_24h_change, p.currency, usdInrRate) : 0;

      // Compute in INR first
      const valINR = a.currency === "INR"
        ? a.holdings * nativePrice
        : a.holdings * nativePrice * usdInrRate;
      const chgINR = a.currency === "INR"
        ? a.holdings * nat24hChg
        : a.holdings * nat24hChg;
      const invINR = a.currency === "INR"
        ? a.holdings * a.averagePrice
        : a.holdings * a.averagePrice * usdInrRate;

      // Convert to display currency
      const rate = segCurrency === "USD" ? 1 / usdInrRate : 1;
      tv  += valINR * rate;
      cv  += chgINR * rate;
      inv += invINR * rate;
    }
    return { total: tv, change24h: cv, invested: inv };
  }, [segmentAssets, prices, usdInrRate, segCurrency]);

  const pnl = segStats.total - segStats.invested;
  const pnlPct = segStats.invested > 0 ? (pnl / segStats.invested) * 100 : 0;
  const changePct = segStats.total > 0 ? (segStats.change24h / (segStats.total - segStats.change24h)) * 100 : 0;
  const dayUp = segStats.change24h >= 0;
  const overallUp = pnl >= 0;

  // Legacy totals (all assets, INR) for the top-level stats strip
  const { totalINR, change24hAll, investedAll } = useMemo(() => {
    let tv = 0, cv = 0, inv = 0;
    for (const a of dbAssets) {
      const p = prices[a.symbol];
      if (p && a.holdings > 0) {
        tv  += calcAssetCurrentValueINR(a.holdings, p.nativePrice, p.currency, usdInrRate);
        cv  += calcAssetCurrentValueINR(a.holdings, calcAsset24hChange(p.nativePrice, p.usd_24h_change, p.currency, usdInrRate), p.currency, 1);
        inv += calcAssetCurrentValueINR(a.holdings, a.averagePrice, a.currency, usdInrRate);
      } else if (a.holdings > 0) {
        const v = calcAssetCurrentValueINR(a.holdings, a.averagePrice, a.currency, usdInrRate);
        tv += v; inv += v;
      }
    }
    return { totalINR: tv, change24hAll: cv, investedAll: inv };
  }, [dbAssets, prices, usdInrRate]);

  const pnlAll = totalINR - investedAll;
  const changePctAll = totalINR > 0 ? (change24hAll / (totalINR - change24hAll)) * 100 : 0;


  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "DASHBOARD", label: "Overview", icon: LayoutDashboard },
    { id: "TRANSACTIONS", label: "Transactions", icon: ListOrdered },
    { id: "ANALYTICS", label: "Analytics", icon: BarChart2 },
    { id: "SETTINGS", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-0 h-12 border-b border-[var(--border-subtle)]">
        <nav className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${syncing ? "text-amber-400" : "text-[var(--green)]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${syncing ? "bg-amber-400 animate-pulse" : "bg-[var(--green)]"}`} />
            {syncing ? "Syncing" : "Live"}
          </div>
          <button
            onClick={() => setShowAddPanel(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border)] text-xs font-medium text-[var(--text-primary)] rounded-lg transition-colors"
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
            {/* Global stats strip (always total, INR) */}
            <div className="shrink-0 flex border-b border-[var(--border-subtle)] overflow-x-auto">
              <Stat label="Total Net Worth" value={fmt(totalINR, "INR")} />
              <Stat
                label="Day Change"
                value={`${change24hAll >= 0 ? "+" : ""}${fmt(change24hAll, "INR")}`}
                sub={`${change24hAll >= 0 ? "+" : ""}${changePctAll.toFixed(2)}%`}
                up={change24hAll >= 0}
              />
              <Stat
                label="Total P&L"
                value={`${pnlAll >= 0 ? "+" : ""}${fmt(pnlAll, "INR")}`}
                sub={`${pnlAll >= 0 ? "+" : ""}${(investedAll > 0 ? (pnlAll / investedAll) * 100 : 0).toFixed(2)}% all time`}
                up={pnlAll >= 0}
              />
              <Stat label="Invested" value={fmt(investedAll, "INR")} />
              <Stat label="USD/INR" value={`₹${usdInrRate.toFixed(2)}`} sub="live fx rate" />
              <Stat label="Holdings" value={`${dbAssets.length} assets`} />
            </div>

            {/* Segment tabs + currency toggle */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
              <div className="flex gap-1">
                {SEGMENTS.map(seg => (
                  <button
                    key={seg.id}
                    onClick={() => setSegment(seg.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: segment === seg.id ? "var(--bg-elevated)" : "transparent",
                      color: segment === seg.id ? "var(--text-primary)" : "var(--text-muted)",
                      border: segment === seg.id ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                  >
                    <span>{seg.flag}</span> {seg.label}
                  </button>
                ))}
              </div>

              {/* Currency toggle */}
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--bg-elevated)" }}>
                {(["INR", "USD"] as Currency[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setSegCurrency(c)}
                    className="px-3 py-1 rounded-md text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: segCurrency === c ? "var(--accent)" : "transparent",
                      color: segCurrency === c ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {c === "INR" ? "₹ INR" : "$ USD"}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment stats */}
            <div className="shrink-0 flex border-b border-[var(--border-subtle)] overflow-x-auto">
              <Stat label={`${SEGMENTS.find(s=>s.id===segment)?.flag} Value (${segCurrency})`} value={fmt(segStats.total, segCurrency)} />
              <Stat
                label="Day Change"
                value={`${dayUp?"+":""}${fmt(segStats.change24h, segCurrency)}`}
                sub={`${dayUp?"+":""}${changePct.toFixed(2)}%`}
                up={dayUp}
              />
              <Stat
                label="P&L"
                value={`${overallUp?"+":""}${fmt(pnl, segCurrency)}`}
                sub={`${overallUp?"+":""}${pnlPct.toFixed(2)}%`}
                up={overallUp}
              />
              <Stat label="Cost Basis" value={fmt(segStats.invested, segCurrency)} />
              <Stat label="Positions" value={`${segmentAssets.length}`} />
            </div>

            {/* Chart + table */}
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 min-w-0 overflow-y-auto">
                {/* Chart */}
                <div className="p-6 border-b border-[var(--border-subtle)]">
                  <AdvancedNetWorthChart assets={segmentAssets} displayCurrency={segCurrency} />
                </div>

                {/* Holdings table */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Holdings</h2>
                    <span className="text-xs text-[var(--text-muted)]">{segmentAssets.length} positions</span>
                  </div>

                  {segmentAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-4">
                        <Plus className="w-5 h-5 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">No holdings in this segment</p>
                      <p className="text-xs text-[var(--text-muted)]">Add assets using the "Add Holding" button</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)]">
                            {["Asset", "Holdings", "Price", `Value (${segCurrency})`, "Day", "P&L", ""].map(h => (
                              <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium pb-3 pr-4 last:pr-0">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {segmentAssets.map(asset => {
                            const p = prices[asset.symbol];
                            // Compute in INR first, then convert
                            const valueINR = p
                              ? calcAssetCurrentValueINR(asset.holdings, p.nativePrice, p.currency, usdInrRate)
                              : calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
                            const costINR = calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
                            const displayVal = segCurrency === "USD" ? valueINR / usdInrRate : valueINR;
                            const displayCost = segCurrency === "USD" ? costINR / usdInrRate : costINR;
                            const pnlRow = displayVal - displayCost;
                            const pnlRowPct = displayCost > 0 ? (pnlRow / displayCost) * 100 : 0;
                            const dayPct = p?.usd_24h_change ?? 0;
                            const dayUp = dayPct >= 0;
                            const gainUp = pnlRow >= 0;
                            const displayPrice = p
                              ? (segCurrency === "USD"
                                  ? (asset.currency === "INR" ? p.nativePrice / usdInrRate : p.nativePrice)
                                  : (asset.currency === "INR" ? p.nativePrice : p.nativePrice * usdInrRate))
                              : null;

                            return (
                              <tr key={asset.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors group">
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2.5">
                                    <AssetLogo symbol={asset.symbol} size={28} />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-[var(--text-primary)] truncate text-xs">{asset.symbol.toUpperCase()}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[100px]">{asset.name}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  {editState?.id === asset.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" step="any"
                                        value={editState.holdings}
                                        onChange={e => setEditState({ ...editState, holdings: e.target.value })}
                                        autoFocus
                                        className="w-20 text-xs px-2 py-1 rounded-md border bg-[var(--bg)] text-[var(--text-primary)] border-[var(--accent)] focus:outline-none tabular"
                                      />
                                      <button onClick={handleEditSave} disabled={editLoading}
                                        className="p-1 rounded text-[var(--green)] hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50">
                                        {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      </button>
                                      <button onClick={() => setEditState(null)}
                                        className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[var(--text-secondary)] tabular">{asset.holdings.toFixed(4)}</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4 text-xs text-[var(--text-primary)] tabular font-medium">
                                  {displayPrice != null ? (
                                    <>{segCurrency === "INR" ? "₹" : "$"}
                                      {displayPrice > 1000
                                        ? displayPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                        : displayPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </>
                                  ) : <span className="text-[var(--text-muted)]">—</span>}
                                </td>
                                <td className="py-3 pr-4 text-xs text-[var(--text-primary)] tabular font-semibold">{fmt(displayVal, segCurrency)}</td>
                                <td className="py-3 pr-4">
                                  <span className={`text-xs font-medium tabular ${dayUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                                    {dayUp ? "+" : ""}{dayPct.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="py-3 pr-4">
                                  <div className={`text-xs font-medium tabular ${gainUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                                    <span>{gainUp ? "+" : ""}{fmt(pnlRow, segCurrency)}</span>
                                    <span className="text-[10px] ml-1 opacity-70">({gainUp ? "+" : ""}{pnlRowPct.toFixed(1)}%)</span>
                                  </div>
                                </td>
                                <td className="py-3 pl-2">
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditState({ id: asset.id, holdings: asset.holdings.toString() })}
                                      className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(asset.id, asset.name)}
                                      className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                <div className="w-[240px] shrink-0 border-l border-[var(--border-subtle)] flex flex-col">
                  <div className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-4">Allocation</p>
                    <AllocationChart />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "TRANSACTIONS" && (
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-6">Transaction History</h2>
            <TransactionsTable />
          </div>
        )}

        {tab === "ANALYTICS" && (
          <div className="p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Performance Analytics</h2>
            <p className="text-xs text-[var(--text-muted)] mb-6">Breakdown of your portfolio's returns and risk profile.</p>
            <PerformanceAnalytics />
          </div>
        )}

        {tab === "SETTINGS" && (
          <div className="p-6 max-w-lg">
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Settings</h2>
            <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>Configure your Folio preferences.</p>
            <div className="space-y-3">

              {/* Theme toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <Sun className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Appearance</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Currently: {theme === "dark" ? "Dark mode" : "Light mode"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Switch to {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>

              {/* Refresh interval */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Price Refresh Interval</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>How often live prices update</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[10, 15, 30, 60].map(s => (
                    <button
                      key={s}
                      onClick={() => setPollInterval(s)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: pollInterval === s ? "var(--accent)" : "var(--bg-elevated)",
                        borderColor: pollInterval === s ? "var(--accent)" : "var(--border)",
                        color: pollInterval === s ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency info */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Base Currency</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All values shown in Indian Rupee (₹ INR)</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}>₹ INR</span>
              </div>

              {/* Export */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer group"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
                onClick={async () => {
                  try {
                    const res = await fetch("/api/portfolio");
                    const data = await res.json();
                    const rows = [["Symbol","Name","Type","Holdings","Avg Price","Currency"]];
                    data.forEach((a: any) => rows.push([a.symbol, a.name, a.type, a.holdings, a.averagePrice, a.currency]));
                    const csv = rows.map(r => r.join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url; link.download = "folio_portfolio.csv"; link.click();
                    URL.revokeObjectURL(url);
                  } catch {}
                }}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Export to CSV</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Download all holdings as a spreadsheet</p>
                  </div>
                </div>
                <Download className="w-4 h-4 transition-colors" style={{ color: "var(--text-muted)" }} />
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Add Holding Slide Panel */}
      {showAddPanel && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[380px] bg-[var(--bg-surface)] border-l border-[var(--border)] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Holding</h3>
              <button onClick={() => setShowAddPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
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
