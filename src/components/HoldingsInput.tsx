"use client";

import { useState, useEffect, useRef } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  HandCoins, CheckCircle2, XCircle, Search,
  Pencil, Trash2, Check, X, Loader2, TrendingUp, TrendingDown
} from "lucide-react";
import { AssetLogo } from "./AssetLogo";

const MANUAL_TYPES = ['CASH', 'REAL_ESTATE', 'GOLD', 'OTHER'];

interface AssetData {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change24h: number;
  logo?: string | null;
  exchange?: string | null;
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
  const [query, setQuery] = useState("");         // what user types
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null); // confirmed selection
  const [quantity, setQuantity] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [transType, setTransType] = useState("BUY");
  const [submitting, setSubmitting] = useState(false);

  // Search
  const [searchState, setSearchState] = useState<{ loading: boolean; data?: AssetData; error?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit state
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const isManual = MANUAL_TYPES.includes(type);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || isManual) {
      setSearchState(null);
      setShowDropdown(false);
      return;
    }

    setSearchState({ loading: true });
    setShowDropdown(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=${type}`);
        const json = await res.json();
        if (!res.ok) {
          setSearchState({ loading: false, error: json.error || "Not found" });
        } else {
          setSearchState({ loading: false, data: json });
        }
      } catch {
        setSearchState({ loading: false, error: "Network error" });
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, type, isManual]);

  const handleSelectAsset = (asset: AssetData) => {
    setSelectedAsset(asset);
    setQuery(asset.name);          // fill input with name
    setShowDropdown(false);
    setSearchState(null);
    // auto-focus quantity input
    setTimeout(() => document.getElementById('qty-input')?.focus(), 50);
  };

  const handleClearSelection = () => {
    setSelectedAsset(null);
    setQuery("");
    setSearchState(null);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setQuery("");
    setSelectedAsset(null);
    setSearchState(null);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSymbol = query.trim();
    let finalName = query.trim();
    let finalPrice = manualPrice;
    const currency = isManual ? "INR" : (selectedAsset?.currency || "USD");

    if (!isManual) {
      if (!selectedAsset) {
        alert("Please search and select an asset from the dropdown first.");
        return;
      }
      finalSymbol = selectedAsset.symbol;
      finalName = selectedAsset.name;
      finalPrice = selectedAsset.price.toString();
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
      setQuery("");
      setSelectedAsset(null);
      setQuantity("");
      setManualPrice("");
      setSearchState(null);
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

  const canSubmit = !submitting && !!quantity &&
    (isManual ? !!manualPrice && !!query.trim() : !!selectedAsset);

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
              <option value="STOCK">🇮🇳 Indian Stock (NSE/BSE)</option>
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

        {/* Search / Ticker input */}
        <div className="relative">
          <label className="text-xs text-slate-400 mb-1 block">
            {isManual ? "Label / Description" : "Search by name or ticker"}
          </label>

          {/* Input wrapper */}
          <div className={`flex items-center gap-2 bg-slate-900 border rounded-lg px-3 py-2 transition-colors ${
            selectedAsset ? "border-emerald-500/60" : "border-slate-700 focus-within:border-violet-500"
          }`}>
            {selectedAsset ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selectedAsset) setSelectedAsset(null); // clear selection when user types again
              }}
              onFocus={() => {
                if (!selectedAsset && searchState?.data) setShowDropdown(true);
              }}
              placeholder={
                type === "CRYPTO" ? "bitcoin, ethereum, solana..." :
                type === "STOCK" ? "Reliance, Infosys, or RELIANCE.NS..." :
                type === "US_STOCK" ? "Apple, Microsoft, or AAPL, SPY..." :
                type === "MF" ? "Search fund name or code..." :
                "Cash savings, SBI account..."
              }
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none min-w-0"
            />
            {/* Loading spinner / clear button */}
            {searchState?.loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
            {selectedAsset && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-slate-500 hover:text-slate-300 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown result */}
          {showDropdown && !isManual && (
            <div
              ref={dropdownRef}
              className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl"
            >
              {searchState?.loading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching live markets...
                </div>
              )}
              {searchState?.error && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-400">
                  <XCircle className="w-4 h-4" />
                  {searchState.error} — try a ticker like MSFT or RELIANCE.NS
                </div>
              )}
              {searchState?.data && (
                <button
                  type="button"
                  onClick={() => handleSelectAsset(searchState.data!)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-600/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <AssetLogo
                      symbol={searchState.data.symbol}
                      logo={searchState.data.logo}
                      type={type}
                      size={34}
                    />
                    <div>
                      <p className="text-[var(--text-primary)] font-semibold text-sm group-hover:text-white">
                        {searchState.data.name}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {searchState.data.symbol.toUpperCase()}
                        {searchState.data.exchange ? ` · ${searchState.data.exchange}` : " · Live"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-slate-100 font-bold text-sm">
                      {searchState.data.currency === "INR" ? "₹" : "$"}
                      {searchState.data.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${
                      searchState.data.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {searchState.data.change24h >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(searchState.data.change24h).toFixed(2)}%
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Selected asset chip */}
          {selectedAsset && (
            <div className="mt-2 flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2">
              <div>
                <span className="text-emerald-300 font-semibold text-sm">{selectedAsset.name}</span>
                <span className="text-slate-500 text-xs ml-2">{selectedAsset.symbol.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-200 font-bold text-sm">
                  {selectedAsset.currency === "INR" ? "₹" : "$"}
                  {selectedAsset.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className={`ml-2 text-xs font-medium ${selectedAsset.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {selectedAsset.change24h >= 0 ? "+" : ""}{selectedAsset.change24h.toFixed(2)}%
                </span>
              </div>
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
              id="qty-input"
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

        {/* Hint for market assets */}
        {!isManual && !selectedAsset && (
          <p className="text-xs text-slate-500 -mt-1">
            Search and click a result above to select the asset, then enter quantity.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
            : selectedAsset
            ? `Add ${selectedAsset.name} →`
            : "Add to Portfolio"
          }
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
                <AssetLogo
                  symbol={asset.symbol}
                  type={asset.type}
                  size={28}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm uppercase truncate">{asset.symbol}</p>
                  <p className="text-slate-500 text-xs truncate">{asset.name}</p>
                </div>

                {editState?.id === asset.id ? (
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-300 text-xs font-medium whitespace-nowrap">
                      {asset.holdings.toFixed(4)}
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
                      title="Remove"
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
