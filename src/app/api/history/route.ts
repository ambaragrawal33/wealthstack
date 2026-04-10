import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: { symbol: string; type: string; currency: string; holdings: number }[] = body.assets || [];

    const yahooAssets = assets.filter(a => ['STOCK', 'US_STOCK', 'MF', 'OTHER'].includes(a.type));
    const cryptoAssets = assets.filter(a => a.type === 'CRYPTO');

    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 1);
    const period2 = new Date();

    const results: Record<string, any> = {};

    // Fetch Yahoo using chart() — historical() is deprecated in v3
    for (const asset of yahooAssets) {
      try {
        const chartData: any = await yf.chart(asset.symbol, {
          period1,
          period2,
          interval: '1wk',
        });

        const quotes = chartData?.quotes ?? [];
        if (quotes.length > 0) {
          results[asset.symbol] = {
            currency: asset.currency,
            prices: quotes
              .filter((q: any) => q.close != null)
              .map((q: any) => ({
                date: q.date,
                price: q.close,
              })),
          };
        }
      } catch (e: any) {
        console.error(`History failed for ${asset.symbol}:`, e.message);
      }
    }

    // Fetch Crypto historical from CoinGecko
    for (const asset of cryptoAssets) {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${asset.symbol}/market_chart?vs_currency=usd&days=365&interval=daily`
        );
        if (res.ok) {
          const data = await res.json();
          results[asset.symbol] = {
            currency: 'USD',
            prices: (data.prices as [number, number][]).map(p => ({
              date: new Date(p[0]),
              price: p[1],
            })),
          };
        }
      } catch (e: any) {
        console.error(`Crypto history failed for ${asset.symbol}:`, e.message);
      }
    }

    // Always fetch USD→INR for currency conversion
    try {
      const inrChart: any = await yf.chart('INR=X', { period1, period2, interval: '1wk' });
      const inrQuotes = inrChart?.quotes ?? [];
      results['INR=X'] = {
        currency: 'USD',
        prices: inrQuotes
          .filter((q: any) => q.close != null)
          .map((q: any) => ({ date: q.date, price: q.close })),
      };
    } catch (e: any) {
      console.error('INR=X history failed:', e.message);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error fetching historical prices:', error.message);
    return NextResponse.json({ error: 'Failed to fetch historical prices' }, { status: 500 });
  }
}
