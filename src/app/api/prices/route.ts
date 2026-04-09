import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { fetchCryptoData } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: { symbol: string, type: string }[] = body.assets || [];

    // Separate by type
    const cryptoIds = assets.filter(a => a.type === 'CRYPTO').map(a => a.symbol.toLowerCase());
    const yahooSymbols = assets.filter(a => ['STOCK', 'MF', 'OTHER'].includes(a.type)).map(a => a.symbol);
    
    // We always want to fetch USD-INR rate
    yahooSymbols.push('INR=X');

    // Fetch Crypto normally
    const cryptoData = await fetchCryptoData(cryptoIds);

    // Fetch Yahoo individually to prevent single-ticker failures crashing the whole batch
    const yahooResults = await Promise.allSettled(
        yahooSymbols.map(sym => (yahooFinance.quote(sym) as Promise<any>).catch(e => {
            console.warn(`Failed to fetch quote for ${sym}`);
            return null;
        }))
    );
    
    // Extract successful quotes
    const yahooArray: any[] = yahooResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value)
        .filter(val => val !== null);

    let usdInrRate = 83.5; // Default fallback
    const prices: Record<string, any> = {};

    // Process Yahoo Data
    for (const quote of yahooArray) {
       if (!quote) continue;
       
       if (quote.symbol === 'INR=X') {
           usdInrRate = quote.regularMarketPrice || usdInrRate;
           continue;
       }

       prices[quote.symbol] = {
           usd: quote.currency === 'INR' ? (quote.regularMarketPrice || 0) / usdInrRate : (quote.regularMarketPrice || 0), // Base USD conversion mapped to be compatible with AssetCard expectations
           nativePrice: quote.regularMarketPrice || 0,
           currency: quote.currency || 'USD',
           usd_24h_change: quote.regularMarketChangePercent || 0,
           name: quote.shortName || quote.longName || quote.symbol,
           symbol: quote.symbol,
       };
    }

    // Combine Crypto
    for (const [id, data] of Object.entries(cryptoData)) {
        prices[id] = {
            ...data,
            nativePrice: data.usd,
            currency: 'USD'
        };
    }

    return NextResponse.json({ usdInrRate, prices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
