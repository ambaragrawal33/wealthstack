import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// yahoo-finance2 v3 requires instantiation
const yf = new YahooFinance();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'STOCK';

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    if (type === 'CRYPTO') {
      // Use CoinGecko for crypto
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error('CoinGecko search failed');
      const data = await res.json();
      const topResult = data.coins?.[0];

      if (!topResult) {
        return NextResponse.json({ error: 'Coin not found' }, { status: 404 });
      }

      const priceRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${topResult.id}&vs_currencies=usd&include_24hr_change=true`
      );
      const priceData = await priceRes.json();

      return NextResponse.json({
        symbol: topResult.id,
        name: topResult.name,
        currency: 'USD',
        price: priceData[topResult.id]?.usd || 0,
        change24h: priceData[topResult.id]?.usd_24h_change || 0,
        logo: topResult.thumb || topResult.large || null,
        type: 'CRYPTO',
      });
    } else {
      // Use Yahoo Finance for stocks/ETFs/MFs
      // Step 1: Try direct quote (user may have typed exact ticker like MSFT, RELIANCE.NS)
      try {
        const quote: any = await yf.quote(query.toUpperCase());
        if (quote && quote.regularMarketPrice) {
          // Clearbit logo by domain from Yahoo Finance website
          const domain = (quote.website || '').replace(/https?:\/\/(www\.)?/, '').split('/')[0];
          const logo = domain ? `https://logo.clearbit.com/${domain}` : null;
          return NextResponse.json({
            symbol: quote.symbol,
            name: quote.shortName || quote.longName || quote.symbol,
            currency: quote.currency || 'USD',
            price: quote.regularMarketPrice || 0,
            change24h: quote.regularMarketChangePercent || 0,
            logo,
            exchange: quote.fullExchangeName || quote.exchange || null,
            type,
          });
        }
      } catch (_) {
        // Direct ticker failed, fall through to search
      }

      // Step 2: Full text search (user typed "microsoft", "reliance", etc.)
      const searchRes: any = await yf.search(query);
      const topRes = searchRes?.quotes?.find((q: any) => q.isYahooFinance && q.quoteType !== 'OPTION');

      if (!topRes) {
        return NextResponse.json({ error: 'Ticker not found' }, { status: 404 });
      }

      const quote: any = await yf.quote(topRes.symbol);
      const domain = (quote.website || '').replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      const logo = domain ? `https://logo.clearbit.com/${domain}` : null;
      return NextResponse.json({
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || topRes.longname || topRes.shortname || quote.symbol,
        currency: quote.currency || 'USD',
        price: quote.regularMarketPrice || 0,
        change24h: quote.regularMarketChangePercent || 0,
        logo,
        exchange: quote.fullExchangeName || quote.exchange || null,
        type,
      });
    }
  } catch (error: any) {
    console.error('Search error:', error.message);
    return NextResponse.json({ error: 'Search failed', details: error.message }, { status: 500 });
  }
}
