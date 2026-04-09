import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Historical data API for total net worth charting
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: { symbol: string, type: string, currency: string }[] = body.assets || [];

    // Separate Yahoo symbols from Crypto symbols
    const yahooSymbols = assets.filter(a => ['STOCK', 'US_STOCK', 'MF', 'OTHER'].includes(a.type)).map(a => a.symbol);
    const cryptoSymbols = assets.filter(a => a.type === 'CRYPTO').map(a => a.symbol.toLowerCase());

    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 1); // 1 year of history

    const results: Record<string, any> = {};

    // For Yahoo symbols
    if (yahooSymbols.length > 0) {
      // Create concurrent fetches, but we must be careful with rate limits
      // For now, sequentially fetch to avoid 429
      for (const symbol of yahooSymbols) {
        try {
            const result: any[] = await yahooFinance.historical(symbol, {
                period1: period1,
                interval: '1wk' // 1 week interval to reduce data
            });
            
            // Format historical to match charting needs
            results[symbol] = {
                prices: result.map((r) => ({
                    date: r.date,
                    price: r.close
                }))
            };
        } catch(e) {
            console.error(`Failed to fetch history for ${symbol}:`, e);
        }
      }
    }

    // For Crypto (CoinGecko)
    if (cryptoSymbols.length > 0) {
       for (const coin of cryptoSymbols) {
           try {
               // Use CoinGecko public API (can be rate limited, so wait/batch if needed)
               const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=365&interval=daily`);
               if(res.ok) {
                   const data = await res.json();
                   results[coin] = {
                       prices: data.prices.map((p: [number, number]) => ({
                           // Coingecko returns timestamp as first elem, price as second
                           date: new Date(p[0]),
                           price: p[1]
                       }))
                   };
               }
           } catch(e) {
               console.error(`Failed to fetch history for ${coin}:`, e);
           }
       }
    }

    // Always fetch INR=X for USD to INR historical conversion
    try {
        const inrHist: any[] = await yahooFinance.historical('INR=X', { period1: period1, interval: '1wk' });
        results['INR=X'] = {
            prices: inrHist.map((r) => ({
                date: r.date,
                price: r.close
            }))
        }
    } catch(e) {
        console.error('Failed to fetch history for INR=X', e);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    return NextResponse.json({ error: "Failed to fetch historical prices" }, { status: 500 });
  }
}
