"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatINR, calcAssetCurrentValueINR } from "@/lib/portfolioEngine";
import { format, subDays, eachWeekOfInterval } from "date-fns";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

type Range = "1M" | "3M" | "6M" | "1Y";

const RANGES: { label: Range; days: number }[] = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

function getInrRateForDate(
  inrHistory: { date: Date | string; price: number }[],
  targetTime: number,
  fallback = 84
): number {
  if (!inrHistory.length) return fallback;
  let closest = fallback;
  let minDiff = Infinity;
  for (const p of inrHistory) {
    const diff = Math.abs(new Date(p.date).getTime() - targetTime);
    if (diff < minDiff) { minDiff = diff; closest = p.price; }
  }
  return closest;
}

export function AdvancedNetWorthChart() {
  const dbAssets = usePortfolioStore((s) => s.dbAssets);
  const prices = usePortfolioStore((s) => s.prices);
  const usdInrRate = usePortfolioStore((s) => s.usdInrRate);
  const history = usePortfolioStore((s) => s.history);
  const setHistoryData = usePortfolioStore((s) => s.setHistoryData);

  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("1Y");
  const [error, setError] = useState<string | null>(null);

  // Fetch history when assets change
  useEffect(() => {
    if (dbAssets.length === 0) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency })),
          }),
        });
        if (!res.ok) throw new Error("History API error");
        const data = await res.json();
        setHistoryData(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [dbAssets.map(a => a.id).join(",")]); // only re-run when asset set changes, not on price updates

  // Build chart data
  const chartData = useMemo(() => {
    if (dbAssets.length === 0) return [];

    const days = RANGES.find(r => r.label === range)?.days ?? 365;
    const now = new Date();
    const start = subDays(now, days);

    // Generate weekly dates in range
    const weeks = eachWeekOfInterval({ start, end: now });

    // INR history for conversion
    const inrHistory = (history as any)?.["INR=X"]?.prices ?? [];

    return weeks.map(weekDate => {
      const targetTime = weekDate.getTime();
      const inrRate = getInrRateForDate(inrHistory, targetTime, usdInrRate ?? 84);
      let totalINR = 0;

      for (const asset of dbAssets) {
        if (!asset.holdings || asset.holdings <= 0) continue;

        const assetHistory = (history as any)?.[asset.symbol]?.prices;

        if (assetHistory && assetHistory.length > 0) {
          // Use historical price closest to this week
          let closestPrice = assetHistory[0].price;
          let minDiff = Infinity;
          for (const p of assetHistory) {
            const diff = Math.abs(new Date(p.date).getTime() - targetTime);
            if (diff < minDiff) { minDiff = diff; closestPrice = p.price; }
          }
          totalINR += calcAssetCurrentValueINR(asset.holdings, closestPrice, asset.currency, inrRate);
        } else {
          // No history available — use current live price for all dates (flat line, better than nothing)
          const livePrice = prices?.[asset.symbol];
          if (livePrice) {
            totalINR += calcAssetCurrentValueINR(
              asset.holdings,
              livePrice.nativePrice ?? livePrice.usd ?? 0,
              asset.currency ?? "USD",
              inrRate
            );
          } else if (asset.averagePrice) {
            // Final fallback: use cost basis
            totalINR += calcAssetCurrentValueINR(
              asset.holdings, asset.averagePrice, asset.currency, inrRate
            );
          }
        }
      }

      return {
        date: weekDate.toISOString().split("T")[0],
        value: Math.round(totalINR),
      };
    }).filter(d => d.value > 0);
  }, [history, dbAssets, prices, usdInrRate, range]);

  // Current total NET WORTH for display
  const currentNetWorth = useMemo(() => {
    if (!dbAssets.length) return 0;
    let total = 0;
    for (const asset of dbAssets) {
      if (!asset.holdings) continue;
      const livePrice = (prices as any)?.[asset.symbol];
      if (livePrice) {
        total += calcAssetCurrentValueINR(
          asset.holdings,
          livePrice.nativePrice ?? livePrice.usd ?? 0,
          asset.currency ?? "USD",
          usdInrRate ?? 84
        );
      } else {
        total += calcAssetCurrentValueINR(
          asset.holdings, asset.averagePrice, asset.currency, usdInrRate ?? 84
        );
      }
    }
    return total;
  }, [dbAssets, prices, usdInrRate]);

  if (dbAssets.length === 0) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center text-slate-500 gap-2">
        <p className="text-sm">Add assets to see your net worth chart.</p>
      </div>
    );
  }

  const startValue = chartData[0]?.value ?? 0;
  const endValue = chartData[chartData.length - 1]?.value ?? currentNetWorth;
  const isPositive = endValue >= startValue;
  const change = endValue - startValue;
  const changePct = startValue > 0 ? (change / startValue) * 100 : 0;
  const color = isPositive ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Total Net Worth</p>
          <p className="text-3xl font-bold text-slate-100">{formatINR(currentNetWorth)}</p>
          {chartData.length > 1 && (
            <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? "+" : ""}{formatINR(change)} ({changePct.toFixed(2)}%) in {range}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  range === r.label
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => {
              setHistoryData({});
              setTimeout(() => {
                fetch("/api/history", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency })),
                  }),
                }).then(r => r.json()).then(setHistoryData).catch(() => {});
              }, 100);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh chart"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Chart */}
      {loading && chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-slate-500 animate-pulse text-sm">
          Loading historical data...
        </div>
      ) : chartData.length < 2 ? (
        <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-slate-500">
          <p className="text-sm">Insufficient history — chart will populate after market data loads.</p>
          <p className="text-xs text-slate-600">Current net worth: <span className="text-slate-300 font-semibold">{formatINR(currentNetWorth)}</span></p>
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={val => {
                  try { return format(new Date(val), range === "1M" ? "MMM d" : "MMM yy"); }
                  catch { return val; }
                }}
                stroke="#334155"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["dataMin * 0.95", "dataMax * 1.05"]}
                tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                stroke="#334155"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length && label) {
                    const val = payload[0].value as number;
                    const diff = val - startValue;
                    const pct = startValue > 0 ? (diff / startValue) * 100 : 0;
                    return (
                      <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-xl">
                        <p className="text-slate-400 text-xs mb-1">
                          {format(new Date(label as string), "MMM d, yyyy")}
                        </p>
                        <p className="text-white font-bold text-base">{formatINR(val)}</p>
                        <p className={`text-xs mt-0.5 font-medium ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {diff >= 0 ? "+" : ""}{formatINR(diff)} ({pct.toFixed(2)}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#netWorthGrad)"
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
