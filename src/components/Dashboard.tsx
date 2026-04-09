"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { AssetCard } from "./AssetCard";
import { HoldingsInput } from "./HoldingsInput";
import { formatINR, calcAssetCurrentValueINR, calcAsset24hChange } from "@/lib/portfolioEngine";
import { Activity, PieChart, TrendingUp, TrendingDown, Bell, Landmark, LayoutDashboard, ListOrdered, BarChart2, Settings } from "lucide-react";
import { AllocationChart } from "./charts/AllocationChart";
import { AdvancedNetWorthChart } from "./charts/AdvancedNetWorthChart";
import { TransactionsTable } from "./views/TransactionsTable";
import { PerformanceAnalytics } from "./views/PerformanceAnalytics";
import { cn } from "@/lib/utils";

type TabView = "DASHBOARD" | "TRANSACTIONS" | "ANALYTICS" | "SETTINGS";

export function Dashboard() {
  const dbAssets = usePortfolioStore((state) => state.dbAssets);
  const setAssets = usePortfolioStore((state) => state.setAssets);
  
  const prices = usePortfolioStore((state) => state.prices);
  const setPricesData = usePortfolioStore((state) => state.setPricesData);
  const usdInrRate = usePortfolioStore((state) => state.usdInrRate);
  
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("DASHBOARD");

  // Initial Load - Fetch from DB
  useEffect(() => {
     fetch('/api/portfolio')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAssets(data);
        })
        .catch(console.error);
  }, [setAssets]);

  // Price Polling
  useEffect(() => {
    if (dbAssets.length === 0) return;

    const reqPayload = {
       assets: dbAssets.map(a => ({ symbol: a.symbol, type: a.type, currency: a.currency }))
    };

    const fetchPrices = async () => {
      setIsFetching(true);
      try {
          const res = await fetch('/api/prices', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(reqPayload)
          });
          const data = await res.json();
          if (data.prices) {
              setPricesData(data.prices, data.usdInrRate);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsFetching(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [dbAssets, setPricesData]);

  // Calculate totals natively in INR
  const { totalValueINR, change24hValueINR, totalInvestedINR } = useMemo(() => {
    let tv = 0;
    let cv = 0;
    let invested = 0;

    for (const asset of dbAssets) {
      if (asset.customValue) {
          // Manual Fixed Assets
          let val = asset.holdings * asset.customValue;
          if (asset.currency === 'USD') val *= usdInrRate;
          tv += val;
          invested += asset.holdings * asset.averagePrice * (asset.currency === 'USD' ? usdInrRate : 1);
          continue;
      }

      const p = prices[asset.symbol];
      if (p && asset.holdings > 0) {
        tv += calcAssetCurrentValueINR(asset.holdings, p.nativePrice, p.currency, usdInrRate);
        cv += calcAssetCurrentValueINR(asset.holdings, calcAsset24hChange(p.nativePrice, p.usd_24h_change, p.currency, usdInrRate), p.currency, 1);
        
        invested += calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
      } else if (!p && asset.holdings > 0) {
        // Fallback to average price if no live price (e.g. rate limited or no API for this MF immediately)
        tv += calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
        invested += calcAssetCurrentValueINR(asset.holdings, asset.averagePrice, asset.currency, usdInrRate);
      }
    }

    return { totalValueINR: tv, change24hValueINR: cv, totalInvestedINR: invested };
  }, [dbAssets, prices, usdInrRate]);

  const pnlINR = totalValueINR - totalInvestedINR;
  const pnlPercent = totalInvestedINR === 0 ? 0 : (pnlINR / totalInvestedINR) * 100;
  const changePercent = totalValueINR === 0 ? 0 : (change24hValueINR / (totalValueINR - change24hValueINR)) * 100;
  const isPositive = change24hValueINR >= 0;
  const isOverallPositive = pnlINR >= 0;

  return (
    <div className="max-w-[90rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Landmark className="w-8 h-8 text-primary" />
            Total Net Worth Tracker
          </h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-medium">
             Unified Global Portfolio | BASE: ₹ (INR) | Live 1 USD = {formatINR(usdInrRate)}
          </p>
        </div>
        
        <div className="flex gap-4">
            <button className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition border border-slate-700 text-slate-300 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-ping"></span>
            </button>
            <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-success'}`}></div>
                 <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                     {isFetching ? 'Syncing...' : 'Live System'}
                 </span>
            </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
         {[
            { id: "DASHBOARD", label: "Dashboard", icon: LayoutDashboard },
            { id: "TRANSACTIONS", label: "Transactions", icon: ListOrdered },
            { id: "ANALYTICS", label: "Analytics", icon: BarChart2 },
            { id: "SETTINGS", label: "Settings", icon: Settings },
         ].map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabView)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap",
                    activeTab === tab.id 
                        ? "bg-primary text-primary-foreground" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
             >
                 <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
         ))}
      </div>

      {activeTab === "DASHBOARD" && (
          <div className="space-y-6">
              {/* Hero Stats Panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="col-span-1 md:col-span-3 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-32 opacity-20 bg-primary blur-[120px] rounded-full pointer-events-none" />
                    <p className="text-slate-400 font-medium">Total Net Worth (Live)</p>
                    <h2 className="text-5xl md:text-7xl text-white font-bold tracking-tighter mt-2 mb-4">
                        {formatINR(totalValueINR)}
                    </h2>
                    <div className={`flex items-center gap-2 text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        <span>{isPositive ? '+' : ''}{formatINR(change24hValueINR)}</span>
                        <span className="px-2 py-1 rounded bg-slate-800/50 text-sm ml-2 font-semibold">
                            {changePercent.toFixed(2)}% (24H)
                        </span>
                    </div>
                  </div>
                  
                  <div className="col-span-1 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-center gap-4">
                      <h3 className="text-slate-400 text-sm font-semibold flex items-center gap-2 mb-2 uppercase tracking-wide">
                          <Activity className="w-4 h-4" /> Lifetime Return
                      </h3>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Capital Invested</p>
                          <p className="text-slate-200 font-bold text-xl">{formatINR(totalInvestedINR)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Absolute P&L</p>
                          <p className={`font-black text-2xl ${isOverallPositive ? 'text-success' : 'text-destructive'}`}>
                            {isOverallPositive ? '+' : ''}{formatINR(pnlINR)} <br/><span className="text-lg opacity-80">({pnlPercent.toFixed(2)}%)</span>
                          </p>
                      </div>
                  </div>
              </div>

              {/* Advanced Graphs and Inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* Main Chart Area */}
                 <div className="lg:col-span-3 space-y-6">
                     <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                         <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">Net Worth Trajectory (1Y)</h3>
                         <AdvancedNetWorthChart />
                     </div>

                     <div>
                         <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">Individual Asset Holdings</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {dbAssets.length === 0 && (
                                <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 font-medium">
                                    No assets found. Use the inputs to build your portfolio.
                                </div>
                            )}
                            {dbAssets.map(asset => (
                                <AssetCard key={asset.id} asset={asset} />
                            ))}
                        </div>
                     </div>
                 </div>
                 
                 {/* Side Panel for Allocation and Input */}
                 <div className="lg:col-span-1 space-y-6">
                     <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                         <h3 className="text-sm uppercase font-bold text-slate-400 mb-4 flex items-center gap-2">
                             <PieChart className="w-4 h-4" /> Asset Allocation
                         </h3>
                         <AllocationChart />
                     </div>
                     <HoldingsInput />
                 </div>
              </div>
          </div>
      )}

      {activeTab === "TRANSACTIONS" && (
         <div className="space-y-6">
             <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">Transaction Ledger</h2>
                <TransactionsTable />
             </div>
         </div>
      )}

      {activeTab === "ANALYTICS" && (
         <div className="space-y-6">
             <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                <h2 className="text-xl font-bold text-slate-200 mb-2 border-slate-800 pb-2">Deep Performance Analytics</h2>
                <p className="text-slate-400 mb-6">Gain insights into your portfolio's best players, worst draggers, and overall growth metrics.</p>
                <PerformanceAnalytics />
             </div>
         </div>
      )}
      
      {activeTab === "SETTINGS" && (
          <div className="space-y-6">
             <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-800 pb-2">System Settings</h2>
                <div className="text-slate-400 space-y-4">
                    <p>Alerts & Watchlist configurations are currently located directly in DB.</p>
                    <p>Import/Export Feature: (Coming soon)</p>
                </div>
             </div>
         </div>
      )}

    </div>
  );
}
