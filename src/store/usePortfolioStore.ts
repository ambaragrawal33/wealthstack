import { create } from "zustand";

export interface DBAsset {
  id: string;
  portfolioId: string;
  type: string;
  symbol: string;
  name: string;
  currency: string;
  holdings: number;
  averagePrice: number;
  customValue?: number;
  transactions: any[];
}

export interface UnifiedPrice {
  usd: number; // Base USD price for standardizing calculations across omni-assets
  nativePrice: number; // The raw price in its native currency (e.g., INR or USD)
  currency: string;
  usd_24h_change: number;
  name?: string;
  symbol?: string;
  image?: string;
  sparkline_in_7d?: { price: number[] };
}

export interface HistoricalPriceData {
   prices: { date: Date | string, price: number }[];
}

export interface OmniPortfolioState {
  dbAssets: DBAsset[];
  prices: Record<string, UnifiedPrice>;
  history: Record<string, HistoricalPriceData>;
  usdInrRate: number;
  
  setAssets: (assets: DBAsset[]) => void;
  setPricesData: (prices: Record<string, UnifiedPrice>, rate: number) => void;
  setHistoryData: (history: Record<string, HistoricalPriceData>) => void;
}

export const usePortfolioStore = create<OmniPortfolioState>((set) => ({
  dbAssets: [],
  prices: {},
  history: {},
  usdInrRate: 83.5, // Default fallback
  
  setAssets: (assets) => set({ dbAssets: assets }),
  setPricesData: (prices, rate) => set({ prices, usdInrRate: rate }),
  setHistoryData: (history) => set({ history }),
}));
