"use client";

import { usePortfolioStore } from "@/store/usePortfolioStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { calcAssetCurrentValueINR, formatINR } from "@/lib/portfolioEngine";
import { useMemo } from "react";

const COLORS = {
  STOCK: "#3b82f6", // blue
  US_STOCK: "#8b5cf6", // purple
  CRYPTO: "#ef4444", // red
  MF: "#10b981", // green
  CASH: "#f59e0b", // yellow
  REAL_ESTATE: "#8b5cf6",
  GOLD: "#fbbf24",
  OTHER: "#6b7280" // gray
};

const TYPE_NAMES: Record<string, string> = {
    STOCK: "Indian Stocks",
    US_STOCK: "US Stocks",
    CRYPTO: "Crypto",
    MF: "Mutual Funds",
    CASH: "Cash",
    REAL_ESTATE: "Real Estate",
    GOLD: "Gold",
    OTHER: "Other Assets"
};

export function AllocationChart() {
  const dbAssets = usePortfolioStore((state) => state.dbAssets);
  const prices = usePortfolioStore((state) => state.prices);
  const usdInrRate = usePortfolioStore((state) => state.usdInrRate);

  const data = useMemo(() => {
    const allocation: Record<string, number> = {};

    dbAssets.forEach(asset => {
        let valInr = 0;
        if (asset.customValue) {
            valInr = asset.customValue * asset.holdings;
            if (asset.currency === 'USD') valInr *= usdInrRate;
        } else {
            const p = prices[asset.symbol];
            if (p) {
                valInr = calcAssetCurrentValueINR(asset.holdings, p.nativePrice, p.currency, usdInrRate);
            } else {
                valInr = calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate); // Fallback to avg price
            }
        }
        
        allocation[asset.type] = (allocation[asset.type] || 0) + valInr;
    });

    return Object.entries(allocation)
        .map(([key, value]) => ({ name: TYPE_NAMES[key] || key, value, type: key }))
        .filter(item => item.value > 0);

  }, [dbAssets, prices, usdInrRate]);

  if (data.length === 0) {
      return <div className="h-full flex items-center justify-center text-slate-500 text-sm">No allocation data</div>;
  }

  return (
    <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.type as keyof typeof COLORS] || COLORS.OTHER} />
                    ))}
                </Pie>
                <Tooltip 
                    formatter={(value: any) => formatINR(value as number)}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
}
