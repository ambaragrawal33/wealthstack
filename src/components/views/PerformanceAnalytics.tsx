"use client";

import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useMemo } from "react";
import { calcAssetCurrentValueINR, calcCAGR, formatINR } from "@/lib/portfolioEngine";
import { TrendingUp, TrendingDown, Activity, ShieldAlert, Award } from "lucide-react";

export function PerformanceAnalytics() {
  const dbAssets = usePortfolioStore((state) => state.dbAssets);
  const prices = usePortfolioStore((state) => state.prices);
  const usdInrRate = usePortfolioStore((state) => state.usdInrRate);
  
  const analytics = useMemo(() => {
     let bestPerformer: any = null;
     let worstPerformer: any = null;
     let bestReturn = -Infinity;
     let worstReturn = Infinity;

     let totalInvested = 0;
     let totalCurrent = 0;

     dbAssets.forEach(asset => {
         // Skip empty holdings
         if (asset.holdings <= 0) return;

         let currentValNative = asset.averagePrice;
         const p = prices[asset.symbol];

         if (asset.customValue) {
             currentValNative = asset.customValue;
         } else if (p) {
             currentValNative = p.nativePrice;
         }

         const investedNative = asset.holdings * asset.averagePrice;
         const currentNative = asset.holdings * currentValNative;

         const returnPct = investedNative > 0 ? ((currentNative - investedNative) / investedNative) * 100 : 0;

         if (returnPct > bestReturn) {
             bestReturn = returnPct;
             bestPerformer = { ...asset, returnPct };
         }
         
         if (returnPct < worstReturn) {
             worstReturn = returnPct;
             worstPerformer = { ...asset, returnPct };
         }

         let valInr = currentNative;
         let invInr = investedNative;
         if (asset.currency === 'USD') {
             valInr *= usdInrRate;
             invInr *= usdInrRate;
         }
         
         totalCurrent += valInr;
         totalInvested += invInr;
     });

     // Approximate CAGR assuming 1 year flat holding for simplicity across all assets if overall portfolio is positive
     // In a real system, we'd calculate duration per transaction
     const cagr = calcCAGR(totalInvested, totalCurrent, 1); 

     return {
         bestPerformer,
         worstPerformer,
         cagr,
         totalInvested,
         totalCurrent
     };
  }, [dbAssets, prices, usdInrRate]);

  if (dbAssets.length === 0) {
      return <div className="text-slate-500 py-12 text-center">Not enough data to calculate performance</div>;
  }

  const { bestPerformer, worstPerformer, cagr } = analytics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
                <Award className="w-32 h-32 text-success" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Top Performer</h4>
            {bestPerformer ? (
                <>
                    <div className="text-2xl font-bold text-white uppercase">{bestPerformer.symbol}</div>
                    <div className="text-slate-300 text-sm">{bestPerformer.name}</div>
                    <div className="mt-4 flex items-center gap-2 text-success font-bold text-xl">
                        <TrendingUp className="w-5 h-5" /> +{bestPerformer.returnPct.toFixed(2)}%
                    </div>
                </>
            ) : (
                <div className="text-slate-500">N/A</div>
            )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 opacity-10">
                <ShieldAlert className="w-32 h-32 text-destructive" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Worst Performer</h4>
            {worstPerformer ? (
                <>
                    <div className="text-2xl font-bold text-white uppercase">{worstPerformer.symbol}</div>
                    <div className="text-slate-300 text-sm">{worstPerformer.name}</div>
                    <div className="mt-4 flex items-center gap-2 text-destructive font-bold text-xl">
                        <TrendingDown className="w-5 h-5" /> {worstPerformer.returnPct.toFixed(2)}%
                    </div>
                </>
            ) : (
                <div className="text-slate-500">N/A</div>
            )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 opacity-10">
                <Activity className="w-32 h-32 text-primary" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Portfolio CAGR (1Y Appx)</h4>
            <div className={`text-4xl font-bold mt-2 ${cagr >= 0 ? 'text-success' : 'text-destructive'}`}>
                {cagr >= 0 ? '+' : ''}{cagr.toFixed(2)}%
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                Compound Annual Growth Rate represents the smoothed annualized yield of your investments.
            </p>
        </div>
    </div>
  );
}
