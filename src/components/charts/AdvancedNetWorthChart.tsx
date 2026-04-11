"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { DBAsset } from "@/store/usePortfolioStore";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, eachWeekOfInterval } from "date-fns";
import { TrendingUp, TrendingDown, RefreshCw, Loader2 } from "lucide-react";

type Range = "1M" | "3M" | "6M" | "1Y";
type Currency = "INR" | "USD";

const RANGES: { label: Range; days: number }[] = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

function fmtVal(val: number, currency: Currency): string {
  if (currency === "USD") {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  }
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

function nearestPrice(
  arr: { date: Date | string; price: number }[],
  targetMs: number
): number | null {
  if (!arr?.length) return null;
  let best = arr[0].price;
  let bestDiff = Infinity;
  for (const p of arr) {
    const diff = Math.abs(new Date(p.date).getTime() - targetMs);
    if (diff < bestDiff) { bestDiff = diff; best = p.price; }
  }
  return best;
}

interface Props {
  /** Only compute net worth for these assets (for segment tabs). Defaults to all. */
  assets?: DBAsset[];
  /** Display currency — defaults to INR */
  displayCurrency?: Currency;
}

export function AdvancedNetWorthChart({ assets: assetsProp, displayCurrency = "INR" }: Props) {
  const dbAssets = usePortfolioStore((s) => s.dbAssets);
  const prices = usePortfolioStore((s) => s.prices);
  const usdInrRate = usePortfolioStore((s) => s.usdInrRate) ?? 84;
  const history = usePortfolioStore((s) => s.history) as Record<string, any>;
  const setHistoryData = usePortfolioStore((s) => s.setHistoryData);

  // Use provided assets or fall back to all
  const assets = assetsProp ?? dbAssets;

  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("1Y");

  const assetKey = dbAssets.map(a => a.id).join(","); // Fetch for ALL assets always

  const doFetch = useCallback(async () => {
    if (!dbAssets.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency, holdings: a.holdings })),
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setHistoryData(data);
    } catch (e) {
      console.error("History fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [assetKey]);

  useEffect(() => { doFetch(); }, [assetKey]);

  // Build the net worth timeseries for the given assets + displayCurrency
  const chartData = useMemo(() => {
    if (!assets.length) return [];

    const days = RANGES.find(r => r.label === range)?.days ?? 365;
    const now = new Date();
    const start = subDays(now, days);
    const weeks = eachWeekOfInterval({ start, end: now });
    const inrHistory: any[] = history?.["INR=X"]?.prices ?? [];

    const points = weeks.map(weekDate => {
      const targetMs = weekDate.getTime();
      const inrRate = nearestPrice(inrHistory, targetMs) ?? usdInrRate;
      let total = 0;

      for (const asset of assets) {
        if (!asset.holdings || asset.holdings <= 0) continue;

        const assetHist = history?.[asset.symbol]?.prices;
        const histCurrency = history?.[asset.symbol]?.currency ?? asset.currency ?? "USD";
        let price: number | null = nearestPrice(assetHist, targetMs);

        // Fallback to live price
        if (price == null) {
          const live = (prices as any)?.[asset.symbol];
          price = live?.nativePrice ?? live?.usd ?? asset.averagePrice ?? 0;
        }

        const safePrice = price ?? 0;

        // First compute in INR
        const valueINR = (histCurrency === "INR" || asset.currency === "INR")
          ? asset.holdings * safePrice
          : asset.holdings * safePrice * inrRate;

        // Then convert to display currency
        const displayVal = displayCurrency === "USD" ? valueINR / inrRate : valueINR;
        total += displayVal;
      }

      return { date: weekDate.toISOString().split("T")[0], value: Math.round(total) };
    });

    return points.filter(p => p.value > 0);
  }, [history, assets, prices, usdInrRate, range, displayCurrency]);

  // Live net worth from live prices
  const currentNetWorth = useMemo(() => {
    let total = 0;
    for (const asset of assets) {
      if (!asset.holdings) continue;
      const live = (prices as any)?.[asset.symbol];
      const price = live?.nativePrice ?? live?.usd ?? asset.averagePrice ?? 0;
      const valueINR = asset.currency === "INR"
        ? asset.holdings * price
        : asset.holdings * price * (usdInrRate ?? 84);
      total += displayCurrency === "USD" ? valueINR / usdInrRate : valueINR;
    }
    return Math.round(total);
  }, [assets, prices, usdInrRate, displayCurrency]);

  if (!assets.length) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No holdings in this segment
      </div>
    );
  }

  const startVal = chartData[0]?.value ?? 0;
  const endVal = chartData[chartData.length - 1]?.value ?? currentNetWorth;
  const change = endVal - startVal;
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0;
  const isUp = change >= 0;
  const color = isUp ? "var(--green)" : "var(--red)";
  const gradId = `chartGrad_${displayCurrency}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: "var(--text-muted)" }}>
            Value
          </p>
          <p className="text-2xl font-bold tabular" style={{ color: "var(--text-primary)" }}>
            {fmtVal(currentNetWorth, displayCurrency)}
          </p>
          {chartData.length > 1 && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium`}
              style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? "+" : ""}{fmtVal(change, displayCurrency)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%) · {range}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--bg-elevated)" }}>
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: range === r.label ? "var(--accent)" : "transparent",
                  color: range === r.label ? "#fff" : "var(--text-muted)",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={doFetch}
            disabled={loading}
            className="p-1.5 rounded-lg border transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)" }}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>

      {/* Chart */}
      {loading && chartData.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
          <p className="text-xs">Fetching historical prices...</p>
        </div>
      ) : chartData.length < 2 ? (
        <div className="h-[220px] flex flex-col items-center justify-center gap-1" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm">Loading chart data...</p>
          <p className="text-xs opacity-60">Current: <span style={{ color: "var(--text-secondary)" }}>{fmtVal(currentNetWorth, displayCurrency)}</span></p>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={d => {
                  try { return format(new Date(d), range === "1M" ? "d MMM" : "MMM yy"); }
                  catch { return d; }
                }}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={v => fmtVal(v, displayCurrency)}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
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
                    <div className="border px-4 py-3 rounded-xl shadow-2xl"
                      style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(label as string), "MMM d, yyyy")}
                      </p>
                      <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                        {fmtVal(val, displayCurrency)}
                      </p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: diff >= 0 ? "var(--green)" : "var(--red)" }}>
                        {diff >= 0 ? "+" : ""}{fmtVal(diff, displayCurrency)} ({pct.toFixed(2)}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isUp ? "#22c55e" : "#ef4444"}
                strokeWidth={1.8}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 4, fill: isUp ? "#22c55e" : "#ef4444", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
