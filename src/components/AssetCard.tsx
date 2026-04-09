"use client";

import { usePortfolioStore, DBAsset } from "@/store/usePortfolioStore";
import { formatINR, calcAssetCurrentValueINR } from "@/lib/portfolioEngine";
import { formatNumber, cn } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, Coins, Building } from "lucide-react";

export function AssetCard({ asset, onClick }: { asset: DBAsset, onClick?: () => void }) {
  const data = usePortfolioStore((state) => state.prices[asset.symbol]);
  const usdInrRate = usePortfolioStore((state) => state.usdInrRate);

  if (!data) return (
      <div className="bg-slate-800/50 animate-pulse border border-slate-700/50 rounded-xl p-5 h-32" />
  );

  const isPositive = data.usd_24h_change >= 0;
  
  // Calculate specific values dynamically using our engine
  const currentValueInr = calcAssetCurrentValueINR(asset.holdings, data.nativePrice, data.currency, usdInrRate);
  
  const sparklineData = data.sparkline_in_7d?.price.map((p, i) => ({ t: i, price: p })) || [];

  return (
    <div 
        onClick={onClick}
        className={cn(
            "bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-md transition-all flex flex-col justify-between",
            onClick ? "cursor-pointer hover:bg-slate-800/60 hover:border-slate-600/50 hover:shadow-lg hover:-translate-y-1" : ""
        )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {data.image ? (
            <img src={data.image} alt={data.name} className="w-10 h-10 rounded-full bg-white/10" />
          ) : (
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
               {asset.type === 'CRYPTO' ? <Coins className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-200 line-clamp-1 max-w-[120px]">{data.name || asset.name}</h3>
            <span className="text-xs text-slate-500 uppercase">{asset.symbol}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-300 text-sm">
             {data.currency === 'INR' ? formatINR(data.nativePrice) : `$${formatNumber(data.nativePrice)}`}
          </p>
          <div className={cn("flex items-center text-xs font-medium justify-end", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(data.usd_24h_change || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
         <div>
             <p className="text-slate-500 text-xs">Total Holding</p>
             <p className="text-slate-200 font-medium text-sm">{formatNumber(asset.holdings)} <span className="uppercase text-slate-500 text-xs">{asset.symbol}</span></p>
             <p className="text-sm font-bold text-slate-100">{formatINR(currentValueInr)}</p>
         </div>

         {sparklineData.length > 0 && (
             <div className="w-20 h-10">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={sparklineData}>
                       <YAxis domain={['auto', 'auto']} hide />
                       <Line 
                         type="monotone" 
                         dataKey="price" 
                         stroke={isPositive ? "var(--color-success)" : "var(--color-destructive)"} 
                         strokeWidth={1.5} 
                         dot={false} 
                         isAnimationActive={false}
                       />
                   </LineChart>
                </ResponsiveContainer>
             </div>
         )}
      </div>
    </div>
  );
}
