import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { fetchCryptoData } from '@/lib/api';

// yahoo-finance2 v3: must instantiate
const yf = new YahooFinance();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: { symbol: string; type: string }[] = body.assets || [];

    // Separate by type - include US_STOCK in yahoo
    const cryptoIds = assets.filter(a => a.type === 'CRYPTO').map(a => a.symbol.toLowerCase());
    const yahooSymbols = assets
      .filter(a => ['STOCK', 'US_STOCK', 'MF', 'OTHER'].includes(a.type))
      .map(a => a.symbol);

    // Always fetch USD-INR rate
    yahooSymbols.push('INR=X');

    // Fetch Crypto + Yahoo concurrently, isolate failures per-ticker
    const [cryptoData, yahooResults] = await Promise.all([
      fetchCryptoData(cryptoIds),
      Promise.allSettled(
        yahooSymbols.map(sym =>
          (yf.quote(sym) as Promise<any>).catch(e => {
            console.warn(`Quote failed for ${sym}:`, e.message);
            return null;
          })
        )
      ),
    ]);

    // Extract successful quotes only
    const yahooArray: any[] = yahooResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .filter(Boolean);

    let usdInrRate = 84.0; // Fallback
    const prices: Record<string, any> = {};

    for (const quote of yahooArray) {
      if (!quote || !quote.symbol) continue;

      if (quote.symbol === 'INR=X') {
        usdInrRate = quote.regularMarketPrice || usdInrRate;
        continue;
      }

      prices[quote.symbol] = {
        usd: quote.currency === 'INR'
          ? (quote.regularMarketPrice || 0) / usdInrRate
          : (quote.regularMarketPrice || 0),
        nativePrice: quote.regularMarketPrice || 0,
        currency: quote.currency || 'USD',
        usd_24h_change: quote.regularMarketChangePercent || 0,
        name: quote.shortName || quote.longName || quote.symbol,
        symbol: quote.symbol,
      };
    }

    // Merge crypto
    for (const [id, data] of Object.entries(cryptoData)) {
      prices[id] = {
        ...data,
        nativePrice: (data as any).usd,
        currency: 'USD',
      };
    }

    return NextResponse.json({ usdInrRate, prices });
  } catch (error: any) {
    console.error('Error fetching prices:', error.message);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
