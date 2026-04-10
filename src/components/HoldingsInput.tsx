"use client";

import { useState, useEffect, useRef } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  HandCoins, CheckCircle2, XCircle, Search,
  Pencil, Trash2, Check, X, Loader2, TrendingUp, TrendingDown
} from "lucide-react";

const MANUAL_TYPES = ['CASH', 'REAL_ESTATE', 'GOLD', 'OTHER'];

interface PreviewData {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change24h: number;
}

interface EditState {
  id: string;
  holdings: string;
}

export function HoldingsInput() {
  const setAssets = usePortfolioStore((s) => s.setAssets);
  const dbAssets = usePortfolioStore((s) => s.dbAssets);

  // Form state
  const [type, setType] = useState("CRYPTO");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [transType, setTransType] = useState("BUY");
  const [submitting, setSubmitting] = useState(false);

  // Live search preview
  const [preview, setPreview] = useState<{ loading: boolean; data?: PreviewData; error?: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit state
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const isManual = MANUAL_TYPES.includes(type);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!symbol.trim() || isManual) {
      setPreview(null);
      return;
    }

    setPreview({ loading: true });

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(symbol.trim())}&type=${type}`);
        const json = await res.json();

        if (!res.ok) {
          setPreview({ loading: false, error: json.error || "Not found" });
          return;
        }

        setPreview({ loading: false, data: json });
      } catch {
        setPreview({ loading: false, error: "Network error" });
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [symbol, type, isManual]);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setSymbol("");
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSymbol = symbol.trim();
    let finalName = symbol.trim();
    let finalPrice = manualPrice;
    const currency = isManual ? "INR" : (preview?.data?.currency || "USD");

    if (!isManual) {
      if (!preview?.data) {
        alert("Please wait for the live market validation to complete.");
        return;
      }
      finalSymbol = preview.data.symbol;
      finalName = preview.data.name;
      finalPrice = preview.data.price.toString();
    }

    if (!finalSymbol || !quantity || !finalPrice) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: finalSymbol,
          name: finalName,
          type,
          currency,
          transType,
          quantity,
          price: finalPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data);
      setSymbol("");
      setQuantity("");
      setManualPrice("");
      setPreview(null);
    } catch (err: any) {
      alert("Failed to add: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from your portfolio?`)) return;
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleEditSave = async () => {
    if (!editState) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editState.id, holdings: editState.holdings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data);
      setEditState(null);
    } catch (err: any) {
      alert("Failed to update: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const canSubmit = !submitting && !preview?.loading && (isManual || !!preview?.data) && !!quantity;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <HandCoins className="w-5 h-5 text-violet-400" />
        Add Holding
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type + Transaction row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Asset Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="CRYPTO">🪙 Crypto</option>
              <option value="STOCK">🇮🇳 Indian Stock</option>
              <option value="US_STOCK">🇺🇸 US Stock / ETF</option>
              <option value="MF">📈 Mutual Fund</option>
              <option value="CASH">💵 Cash / Bank</option>
              <option value="REAL_ESTATE">🏠 Real Estate</option>
              <option value="GOLD">🥇 Gold</option>
              <option value="OTHER">📦 Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Direction</label>
            <select
              value={transType}
              onChange={(e) => setTransType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>

        {/* Ticker input */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            {isManual ? "Label / Description" : "Ticker / Name (e.g. MSFT, bitcoin, RELIANCE.NS)"}
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={
              type === "CRYPTO" ? "bitcoin, ethereum, solana" :
              type === "STOCK" ? "RELIANCE.NS, INFY.NS, TCS.NS" :
              type === "US_STOCK" ? "AAPL, MSFT, SPY" :
              type === "MF" ? "0P0000XVMK.BO" :
              "Cash savings, SBI account..."
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            required
          />

          {/* Live preview card */}
          {!isManual && preview && (
            <div className="mt-2 p-3 rounded-xl border bg-slate-900/90 flex items-center justify-between min-h-[52px]">
              {preview.loading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse w-full">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching live markets...
                </div>
              ) : preview.error ? (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{preview.error}</span>
                </div>
              ) : preview.data ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-slate-100 font-semibold text-sm leading-tight">{preview.data.name}</p>
                      <p className="text-slate-500 text-xs">{preview.data.symbol.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-100 font-bold text-sm">
                      {preview.data.currency === "INR" ? "₹" : "$"}
                      {preview.data.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${preview.data.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {preview.data.change24h >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(preview.data.change24h).toFixed(2)}%
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Quantity + Manual price row */}
        <div className={`grid gap-3 ${isManual ? "grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              {isManual ? "Quantity / Units" : "Quantity / Shares"}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          {isManual && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Value per unit (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add to Portfolio"}
        </button>
      </form>

      {/* Holdings list with edit / delete */}
      {dbAssets.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <h4 className="text-sm font-semibold text-slate-400 mb-3">Your Holdings</h4>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {dbAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-2 bg-slate-900/60 px-3 py-2.5 rounded-xl border border-slate-700/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm uppercase truncate">{asset.symbol}</p>
                  <p className="text-slate-500 text-xs truncate">{asset.name}</p>
                </div>

                {editState?.id === asset.id ? (
                  /* Edit mode */
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editState.holdings}
                      onChange={(e) => setEditState({ ...editState, holdings: e.target.value })}
                      className="w-24 bg-slate-800 border border-violet-500 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleEditSave}
                      disabled={editLoading}
                      className="p-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditState(null)}
                      className="p-1.5 rounded-md bg-slate-700/40 hover:bg-slate-600/40 text-slate-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-300 text-xs font-medium whitespace-nowrap">
                      {asset.holdings.toFixed(4)} units
                    </span>
                    <button
                      onClick={() => setEditState({ id: asset.id, holdings: asset.holdings.toString() })}
                      className="p-1.5 rounded-md bg-slate-700/40 hover:bg-violet-600/30 text-slate-400 hover:text-violet-400 transition-colors"
                      title="Edit holdings"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id, asset.name)}
                      className="p-1.5 rounded-md bg-slate-700/40 hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove from portfolio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
