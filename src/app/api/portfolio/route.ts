import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Default Portfolio ID for single-user setup
const MAIN_PORTFOLIO_ID = 'main-portfolio';

async function ensurePortfolio() {
  let portfolio = await prisma.portfolio.findUnique({ where: { id: MAIN_PORTFOLIO_ID } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { id: MAIN_PORTFOLIO_ID, name: 'Main Portfolio' }
    });
  }
  return portfolio;
}

export async function GET() {
  try {
    await ensurePortfolio();
    const assets = await prisma.asset.findMany({
      where: { portfolioId: MAIN_PORTFOLIO_ID },
      include: { transactions: { orderBy: { date: 'desc' } } }
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("GET /api/portfolio error:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePortfolio();
    const body = await req.json();
    const { symbol, name, type, currency, transType, quantity, price, date } = body;

    let asset = await prisma.asset.findUnique({
      where: { portfolioId_symbol: { portfolioId: MAIN_PORTFOLIO_ID, symbol } }
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          portfolioId: MAIN_PORTFOLIO_ID,
          symbol,
          name: name || symbol,
          type,
          currency,
        }
      });
    }

    // Adjust holdings and calculate new average price
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const isBuy = transType === 'BUY';
    
    let newHoldings = asset.holdings + (isBuy ? qtyNum : -qtyNum);
    let newAvgPrice = asset.averagePrice;
    
    if (isBuy && newHoldings > 0) {
        // Recalculate average price only on BUYS
        const totalValueOld = asset.holdings * asset.averagePrice;
        const totalValueNew = qtyNum * priceNum;
        newAvgPrice = (totalValueOld + totalValueNew) / newHoldings;
    } else if (newHoldings <= 0) {
        newHoldings = 0;
        newAvgPrice = 0; // reset
    }

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          assetId: asset.id,
          type: transType,
          quantity: qtyNum,
          price: priceNum,
          date: date ? new Date(date) : new Date(),
        }
      }),
      prisma.asset.update({
        where: { id: asset.id },
        data: { holdings: newHoldings, averagePrice: newAvgPrice }
      })
    ]);

    const updatedAssets = await prisma.asset.findMany({
      where: { portfolioId: MAIN_PORTFOLIO_ID },
      include: { transactions: { orderBy: { date: 'desc' } } }
    });
    
    return NextResponse.json(updatedAssets);
  } catch (error) {
    console.error("POST /api/portfolio error:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
