"use client";

import { useState, useEffect } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { Plus, HandCoins, CheckCircle2, XCircle, Search } from "lucide-react";
import { formatINR } from "@/lib/portfolioEngine";

export function HoldingsInput() {
  const setAssets = usePortfolioStore((state) => state.setAssets);
  const dbAssets = usePortfolioStore((state) => state.dbAssets);
  const usdInrRate = usePortfolioStore((state) => state.usdInrRate);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "CRYPTO",
    symbol: "",
    name: "",
    currency: "USD",
    transType: "BUY",
    quantity: "",
    price: "",
  });

  const [preview, setPreview] = useState<{ loading: boolean; data?: any; error?: string } | null>(null);

  // Debounce search effect
  useEffect(() => {
     if (!formData.symbol || formData.type === 'CASH' || formData.type === 'REAL_ESTATE' || formData.type === 'GOLD' || formData.type === 'OTHER') {
         setPreview(null);
         return;
     }

     const timer = setTimeout(async () => {
         setPreview({ loading: true });
         try {
             const res = await fetch(`/api/search?q=${encodeURIComponent(formData.symbol)}&type=${formData.type}`);
             const data = await res.json();
             
             if (!res.ok) throw new Error(data.error || "Not found");
             
             setPreview({ loading: false, data });
             // Auto-fill actual name and currency
             setFormData(prev => ({ 
                 ...prev, 
                 name: data.name || prev.name,
             }));
         } catch (e: any) {
             setPreview({ loading: false, error: e.message });
         }
     }, 600); // 600ms debounce

     return () => clearTimeout(timer);
  }, [formData.symbol, formData.type]);

  const isMarketAsset = !['CASH', 'REAL_ESTATE', 'GOLD', 'OTHER'].includes(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPrice = formData.price;
    if (isMarketAsset) {
       if (!preview || !preview.data) {
           alert("Please wait for live market data validation.");
           return;
       }
       finalPrice = preview.data.price?.toString();
    }

    if (!formData.symbol || !formData.quantity || !finalPrice) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ ...formData, price: finalPrice })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAssets(data);
      setFormData({ ...formData, symbol: "", quantity: "", price: "", name: "" }); // Reset
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to add transaction. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md">
       <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
           <HandCoins className="w-5 h-5 text-primary" />
           Add Transaction
       </h3>
       
       <form onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-2 gap-3">
               <div>
                   <label className="text-xs text-slate-400 mb-1 block">Asset Type</label>
                   <select 
                       value={formData.type}
                       onChange={e => {
                           const isUsd = e.target.value === 'CRYPTO' || e.target.value === 'US_STOCK';
                           setFormData({ ...formData, type: e.target.value, symbol: '', currency: isUsd ? 'USD' : 'INR' })
                       }}
                       className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary"
                    >
                       <option value="CRYPTO">Crypto (CoinGecko)</option>
                       <option value="STOCK">Indian Stock (Yahoo)</option>
                       <option value="US_STOCK">US Stock (Yahoo)</option>
                       <option value="MF">Mutual Fund (Yahoo)</option>
                       <option value="CASH">Cash / Bank (Manual)</option>
                       <option value="REAL_ESTATE">Real Estate (Manual)</option>
                       <option value="GOLD">Gold (Manual)</option>
                       <option value="OTHER">Other (Manual)</option>
                   </select>
               </div>
               <div>
                   <label className="text-xs text-slate-400 mb-1 block">Transaction Type</label>
                   <select 
                       value={formData.transType}
                       onChange={e => setFormData({ ...formData, transType: e.target.value })}
                       className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary"
                    >
                       <option value="BUY">BUY</option>
                       <option value="SELL">SELL</option>
                   </select>
               </div>
           </div>

           <div>
               <label className="text-xs text-slate-400 mb-1 block">Ticker / Symbol / Identifier</label>
               <input 
                   type="text" 
                   placeholder={formData.type === 'CRYPTO' ? 'bitcoin, ethereum' : 'RELIANCE.NS, AAPL'}
                   value={formData.symbol}
                   onChange={e => setFormData({ ...formData, symbol: e.target.value, name: e.target.value })}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary"
                   required
               />
               
               {/* Live Preview UI */}
               {preview && (
                   <div className="mt-2 text-sm p-3 rounded-xl border border-slate-700 bg-slate-900/80 flex items-center justify-between">
                       {preview.loading ? (
                           <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                               <Search className="w-4 h-4" /> Searching live market...
                           </div>
                       ) : preview.error ? (
                           <div className="flex items-center gap-2 text-destructive font-medium">
                               <XCircle className="w-4 h-4" /> {preview.error}
                           </div>
                       ) : preview.data ? (
                           <>
                               <div className="flex items-center gap-2">
                                   <CheckCircle2 className="w-4 h-4 text-success" />
                                   <div>
                                       <span className="text-slate-200 font-bold block leading-tight">{preview.data.name}</span>
                                       <span className="text-slate-500 text-xs">{preview.data.symbol.toUpperCase()} • Live Match</span>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className="block text-slate-200 font-bold">
                                       {preview.data.currency === 'INR' ? '₹' : '$'}{(preview.data.price).toLocaleString()}
                                   </span>
                                   <span className="text-xs text-slate-500 uppercase">Live Market</span>
                               </div>
                           </>
                       ) : null}
                   </div>
               )}
           </div>

           <div className={`grid ${isMarketAsset ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
               <div>
                   <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
                   <input 
                       type="number" step="any" min="0" required
                       value={formData.quantity}
                       onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                       className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary"
                   />
               </div>
               {!isMarketAsset && (
                   <div>
                       <label className="text-xs text-slate-400 mb-1 block">Value/Price per unit ({formData.currency})</label>
                       <input 
                           type="number" step="any" min="0" required
                           value={formData.price}
                           onChange={e => setFormData({ ...formData, price: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary"
                       />
                   </div>
               )}
           </div>

           <button 
             type="submit"
             disabled={loading || preview?.loading || !!preview?.error}
             className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
              {loading ? "Processing..." : "Add to Ledger"}
           </button>
       </form>

       {/* Brief Holding Breakdown locally */}
       {dbAssets.length > 0 && (
           <div className="mt-8 border-t border-slate-700/50 pt-4">
               <h4 className="text-sm font-semibold text-slate-400 mb-3">Portfolio Ledger Book</h4>
               <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                   {dbAssets.map(asset => (
                       <div key={asset.id} className="flex flex-col gap-1 bg-slate-900/50 p-3 rounded-xl border border-slate-700/30">
                           <div className="flex justify-between items-center font-medium">
                               <span className="text-slate-200 uppercase">{asset.symbol}</span>
                               <span className="text-slate-300">{asset.holdings.toFixed(4)} Units</span>
                           </div>
                           <div className="flex justify-between text-xs text-slate-500">
                               <span>Avg Price: {asset.averagePrice.toFixed(2)} {asset.currency}</span>
                               <span>{asset.type}</span>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}
    </div>
  );
}
