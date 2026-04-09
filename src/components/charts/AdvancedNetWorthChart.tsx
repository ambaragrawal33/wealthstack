"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatINR, calcAssetCurrentValueINR } from "@/lib/portfolioEngine";
import { format } from "date-fns";

export function AdvancedNetWorthChart() {
  const dbAssets = usePortfolioStore((state) => state.dbAssets);
  const history = usePortfolioStore((state) => state.history);
  const setHistoryData = usePortfolioStore((state) => state.setHistoryData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (dbAssets.length === 0) return;
     
     const fetchHistory = async () => {
         setLoading(true);
         try {
             // Only fetch history for assets that need it
             const payload = {
                 assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency }))
             };

             const res = await fetch('/api/history', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });
             
             if (res.ok) {
                 const data = await res.json();
                 setHistoryData(data);
             }
         } catch(e) {
             console.error("Failed to fetch chart history", e);
         } finally {
             setLoading(false);
         }
     };

     // Note: History changes rarely, so we only fetch once on mount/asset change
     fetchHistory();
  }, [dbAssets, setHistoryData]);

  // Aggregate history into a single timeline
  const chartData = useMemo(() => {
      if (Object.keys(history).length === 0) return [];
      
      // Get all unique dates. We'll approximate by weekly intervals to keep it fast
      const datesSet = new Set<string>();
      
      // Extract INR history if available for USD adjustments
      const inrHistory = history['INR=X']?.prices || [];
      const getInrRateForDate = (dateStr: string) => {
          const targetD = new Date(dateStr).getTime();
          // Find closest
          let closest = 83.5;
          let minDiff = Infinity;
          for(const p of inrHistory) {
              const df = Math.abs(new Date(p.date).getTime() - targetD);
              if (df < minDiff) {
                  minDiff = df;
                  closest = p.price;
              }
          }
          return closest;
      };

      for (const [sym, data] of Object.entries(history)) {
          if (sym === 'INR=X') continue;
          data.prices.forEach(p => {
              // Normalize to nearest day
              const d = new Date(p.date).toISOString().split('T')[0];
              datesSet.add(d);
          });
      }

      const sortedDates = Array.from(datesSet).sort();
      
      return sortedDates.map(dateStr => {
          let totalInr = 0;
          const targetTime = new Date(dateStr).getTime();
          const inrRate = getInrRateForDate(dateStr);

          // For each asset we hold, find its value at this date
          for (const asset of dbAssets) {
              // Manual assets fallback to average price or custom value
              if (asset.customValue) {
                  let val = asset.holdings * asset.customValue;
                  if (asset.currency === 'USD') val *= inrRate;
                  totalInr += val;
                  continue;
              }

              const hist = history[asset.symbol === 'bitcoin' ? 'bitcoin' : asset.symbol]; // ensure valid mapping
              if (!hist || hist.prices.length === 0) {
                  // Fallback: Use flat average price if no history exists
                  let val = asset.holdings * asset.averagePrice;
                  if (asset.currency === 'USD') val *= inrRate;
                  totalInr += val;
                  continue;
              }

              // Find closest price around this date
              let closestPrice = hist.prices[0].price;
              let minDiff = Infinity;
              for(const p of hist.prices) {
                 const diff = Math.abs(new Date(p.date).getTime() - targetTime);
                 if (diff < minDiff) {
                     minDiff = diff;
                     closestPrice = p.price;
                 }
              }

              totalInr += calcAssetCurrentValueINR(asset.holdings, closestPrice, asset.currency, inrRate);
          }

          return {
              date: dateStr,
              value: totalInr
          };
      });

  }, [history, dbAssets]);

  if (loading && chartData.length === 0) {
      return <div className="h-[300px] flex items-center justify-center text-slate-500 animate-pulse">Loading historical data...</div>;
  }

  if (chartData.length === 0) {
       return <div className="h-[300px] flex items-center justify-center text-slate-500">Insufficient data for chart</div>;
  }

  const startValue = chartData[0].value;
  const endValue = chartData[chartData.length - 1].value;
  const isPositive = endValue >= startValue;
  const color = isPositive ? "#10b981" : "#ef4444"; // green or red

  return (
    <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'MMM d')}
                    stroke="#475569" 
                    fontSize={12}
                    tickMargin={10}
                    minTickGap={30}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    domain={['dataMin - (dataMin * 0.05)', 'dataMax + (dataMax * 0.05)']} 
                    hide 
                />
                <Tooltip 
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length && label) {
                            return (
                                <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-lg">
                                    <p className="text-slate-400 text-xs mb-1">{format(new Date(label as string), 'MMM d, yyyy')}</p>
                                    <p className="text-slate-100 font-bold text-lg">
                                        {formatINR(payload[0].value as number)}
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
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
}
