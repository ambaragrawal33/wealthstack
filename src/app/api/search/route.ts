import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'STOCK'; // STOCK, CRYPTO, etc.

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    if (type === 'CRYPTO') {
       // Search via CoinGecko or just do a quick lookup
       // CoinGecko search API: /search?query={query}
       const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
       if (!res.ok) throw new Error("CoinGecko search failed");
       
       const data = await res.json();
       const topResult = data.coins?.[0];
       
       if (topResult) {
           // Fetch actual price for top result
           const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${topResult.id}&vs_currencies=usd`);
           const priceData = await priceRes.json();
           
           return NextResponse.json({
               symbol: topResult.id, // we use 'id' as symbol for coingecko
               name: topResult.name,
               currency: 'USD',
               price: priceData[topResult.id]?.usd || 0,
               type: 'CRYPTO'
           });
       } else {
           return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
       }
    } else {
       // Search via Yahoo Finance
       // Just fetch quote directly for exact ticker matching, or we can use search
       try {
           const quote: any = await yahooFinance.quote(query.toUpperCase());
           return NextResponse.json({
               symbol: quote.symbol,
               name: quote.shortName || quote.longName || quote.symbol,
               currency: quote.currency || 'USD',
               price: quote.regularMarketPrice || 0,
               type: type
           });
       } catch (e) {
           // We can also try search if exact ticker not found
           const searchRes: any = await yahooFinance.search(query);
           const topRes = searchRes.quotes && searchRes.quotes.length > 0 ? searchRes.quotes[0] : null; 
           
           if (topRes) {
               const quote: any = await yahooFinance.quote(topRes.symbol);
               return NextResponse.json({
                   symbol: quote.symbol,
                   name: quote.shortName || quote.longName || quote.symbol,
                   currency: quote.currency || 'USD',
                   price: quote.regularMarketPrice || 0,
                   type: type
               });
           }

           return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
       }
    }
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to search ticker" }, { status: 500 });
  }
}
