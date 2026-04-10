"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, eachWeekOfInterval } from "date-fns";
import { TrendingUp, TrendingDown, RefreshCw, Loader2 } from "lucide-react";

type Range = "1M" | "3M" | "6M" | "1Y";
const RANGES: { label: Range; days: number }[] = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

function formatINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

// Find nearest price in a sorted price array
function nearestPrice(
  priceArr: { date: Date | string; price: number }[],
  targetMs: number
): number | null {
  if (!priceArr?.length) return null;
  let best = priceArr[0].price;
  let bestDiff = Infinity;
  for (const p of priceArr) {
    const diff = Math.abs(new Date(p.date).getTime() - targetMs);
    if (diff < bestDiff) { bestDiff = diff; best = p.price; }
  }
  return best;
}

export function AdvancedNetWorthChart() {
  const dbAssets = usePortfolioStore((s) => s.dbAssets);
  const prices = usePortfolioStore((s) => s.prices);
  const usdInrRate = usePortfolioStore((s) => s.usdInrRate) ?? 84;
  const history = usePortfolioStore((s) => s.history) as Record<string, any>;
  const setHistoryData = usePortfolioStore((s) => s.setHistoryData);

  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("1Y");
  const [fetched, setFetched] = useState(false);

  const assetKey = dbAssets.map(a => a.id).join(",");

  const doFetch = useCallback(async () => {
    if (!dbAssets.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: dbAssets.map(a => ({
            symbol: a.symbol,
            type: a.type,
            currency: a.currency,
            holdings: a.holdings,
          })),
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setHistoryData(data);
      setFetched(true);
    } catch (e) {
      console.error("History fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [assetKey]);

  useEffect(() => {
    doFetch();
  }, [assetKey]);

  // Build the net worth timeseries
  const chartData = useMemo(() => {
    if (!dbAssets.length) return [];

    const days = RANGES.find(r => r.label === range)?.days ?? 365;
    const now = new Date();
    const start = subDays(now, days);
    const weeks = eachWeekOfInterval({ start, end: now });

    const inrHistory: any[] = history?.["INR=X"]?.prices ?? [];

    const points = weeks.map(weekDate => {
      const targetMs = weekDate.getTime();
      const inrRate = nearestPrice(inrHistory, targetMs) ?? usdInrRate;
      let totalINR = 0;

      for (const asset of dbAssets) {
        if (!asset.holdings || asset.holdings <= 0) continue;

        const assetHist = history?.[asset.symbol]?.prices;
        const assetCurrency = history?.[asset.symbol]?.currency ?? asset.currency ?? "USD";

        let price: number | null = nearestPrice(assetHist, targetMs);

        // Fallback to live price if no history
        if (price == null) {
          const live = (prices as any)?.[asset.symbol];
          price = live?.nativePrice ?? live?.usd ?? asset.averagePrice ?? 0;
        }

        // Convert to INR
        const safePrice = price ?? 0;
        const valueINR = assetCurrency === "INR" || asset.currency === "INR"
          ? asset.holdings * safePrice
          : asset.holdings * safePrice * inrRate;

        totalINR += valueINR;
      }

      return {
        date: weekDate.toISOString().split("T")[0],
        value: Math.round(totalINR),
      };
    });

    return points.filter(p => p.value > 0);
  }, [history, dbAssets, prices, usdInrRate, range]);

  // Current net worth from live prices
  const currentNetWorth = useMemo(() => {
    let total = 0;
    for (const asset of dbAssets) {
      if (!asset.holdings) continue;
      const live = (prices as any)?.[asset.symbol];
      const price = live?.nativePrice ?? live?.usd ?? asset.averagePrice ?? 0;
      const currency = asset.currency ?? "USD";
      total += currency === "INR" ? asset.holdings * price : asset.holdings * price * (usdInrRate ?? 84);
    }
    return Math.round(total);
  }, [dbAssets, prices, usdInrRate]);

  if (dbAssets.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-slate-500 text-sm">
        Add assets to see your net worth chart
      </div>
    );
  }

  const startVal = chartData[0]?.value ?? 0;
  const endVal = chartData[chartData.length - 1]?.value ?? currentNetWorth;
  const change = endVal - startVal;
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0;
  const isUp = change >= 0;
  const color = isUp ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Net Worth</p>
          <p className="text-3xl font-bold text-white tabular-nums">
            {formatINR(currentNetWorth)}
          </p>
          {chartData.length > 1 && (
            <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? "+" : ""}{formatINR(change)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%) · {range}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-900/70 rounded-lg p-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  range === r.label ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={doFetch}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      {loading && chartData.length === 0 ? (
        <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          <p className="text-sm">Fetching 1 year of market history...</p>
        </div>
      ) : chartData.length < 2 ? (
        <div className="h-[260px] flex flex-col items-center justify-center gap-1 text-slate-500">
          <p className="text-sm">Loading chart data...</p>
          <p className="text-xs text-slate-600">Current value: <span className="text-slate-300">{formatINR(currentNetWorth)}</span></p>
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={d => {
                  try { return format(new Date(d), range === "1M" ? "d MMM" : "MMM yy"); }
                  catch { return d; }
                }}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={v => formatINR(v)}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  const val = payload[0].value as number;
                  const diff = val - startVal;
                  const pct = startVal > 0 ? (diff / startVal) * 100 : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl shadow-2xl">
                      <p className="text-slate-400 text-xs mb-1">
                        {format(new Date(label as string), "MMM d, yyyy")}
                      </p>
                      <p className="text-white font-bold text-lg">{formatINR(val)}</p>
                      <p className={`text-xs mt-0.5 font-medium ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {diff >= 0 ? "+" : ""}{formatINR(diff)} ({pct.toFixed(2)}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
