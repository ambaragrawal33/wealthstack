import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// yahoo-finance2 v3: must instantiate
const yf = new YahooFinance();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: { symbol: string; type: string; currency: string }[] = body.assets || [];

    const yahooSymbols = assets
      .filter(a => ['STOCK', 'US_STOCK', 'MF', 'OTHER'].includes(a.type))
      .map(a => a.symbol);

    const cryptoSymbols = assets
      .filter(a => a.type === 'CRYPTO')
      .map(a => a.symbol.toLowerCase());

    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 1); // 1 year back

    const results: Record<string, any> = {};

    // Fetch Yahoo historical (stocks, ETFs, MFs)
    for (const symbol of yahooSymbols) {
      try {
        const result: any[] = await (yf.historical(symbol, {
          period1,
          interval: '1wk',
        }) as Promise<any[]>);

        if (result && result.length > 0) {
          results[symbol] = {
            prices: result
              .filter(r => r.close != null)
              .map(r => ({ date: r.date, price: r.close })),
          };
        }
      } catch (e: any) {
        console.error(`History failed for ${symbol}:`, e.message);
      }
    }

    // Fetch Crypto historical (CoinGecko — 365 day daily)
    for (const coin of cryptoSymbols) {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=365&interval=daily`
        );
        if (res.ok) {
          const data = await res.json();
          results[coin] = {
            prices: (data.prices as [number, number][]).map(p => ({
              date: new Date(p[0]),
              price: p[1],
            })),
          };
        }
      } catch (e: any) {
        console.error(`Crypto history failed for ${coin}:`, e.message);
      }
    }

    // Always fetch USD→INR historical rate for conversion
    try {
      const inrHist: any[] = await (yf.historical('INR=X', {
        period1,
        interval: '1wk',
      }) as Promise<any[]>);
      results['INR=X'] = {
        prices: inrHist
          .filter(r => r.close != null)
          .map(r => ({ date: r.date, price: r.close })),
      };
    } catch (e: any) {
      console.error('History failed for INR=X:', e.message);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error fetching historical prices:', error.message);
    return NextResponse.json({ error: 'Failed to fetch historical prices' }, { status: 500 });
  }
}
