import { UnifiedPrice } from "@/store/usePortfolioStore";

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: {
    price: number[];
  };
}

export async function fetchCryptoData(ids: string[]): Promise<Record<string, UnifiedPrice & { name: string, symbol: string, image: string }>> {
  if (ids.length === 0) return {};

  try {
    const idsQuery = ids.join(",");
    const response = await fetch(
      `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&ids=${idsQuery}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`,
      { next: { revalidate: 10 } } // for Next.js caching if used server-side
    );

    if (!response.ok) {
      if (response.status === 429) {
         console.warn("CoinGecko API rate limit reached. Retrying later.");
         return {}; // Handle rate limiting gracefully by returning empty mapping (won't update state)
      }
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data: CoinMarketData[] = await response.json();
    
    // Convert array to Record matching our store format
    const pricesRecord: Record<string, UnifiedPrice & { name: string, symbol: string, image: string }> = {};
    for (const coin of data) {
      pricesRecord[coin.id] = {
        usd: coin.current_price,
        nativePrice: coin.current_price,
        currency: 'USD',
        usd_24h_change: coin.price_change_percentage_24h,
        sparkline_in_7d: coin.sparkline_in_7d,
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
      };
    }
    
    return pricesRecord;
  } catch (error) {
    console.error("Error fetching crypto data:", error);
    return {};
  }
}
