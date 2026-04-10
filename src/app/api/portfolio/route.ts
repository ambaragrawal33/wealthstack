import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const MAIN_PORTFOLIO_ID = 'main-portfolio';

async function ensurePortfolio() {
  let portfolio = await prisma.portfolio.findUnique({ where: { id: MAIN_PORTFOLIO_ID } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { id: MAIN_PORTFOLIO_ID, name: 'Main Portfolio' },
    });
  }
  return portfolio;
}

async function getAllAssets() {
  return prisma.asset.findMany({
    where: { portfolioId: MAIN_PORTFOLIO_ID },
    include: { transactions: { orderBy: { date: 'desc' } } },
  });
}

export async function GET() {
  try {
    await ensurePortfolio();
    const assets = await getAllAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error('GET /api/portfolio error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePortfolio();
    const body = await req.json();
    const { symbol, name, type, currency, transType, quantity, price, date } = body;

    let asset = await prisma.asset.findUnique({
      where: { portfolioId_symbol: { portfolioId: MAIN_PORTFOLIO_ID, symbol } },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: { portfolioId: MAIN_PORTFOLIO_ID, symbol, name: name || symbol, type, currency },
      });
    }

    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const isBuy = transType === 'BUY';

    let newHoldings = asset.holdings + (isBuy ? qtyNum : -qtyNum);
    let newAvgPrice = asset.averagePrice;

    if (isBuy && newHoldings > 0) {
      const totalValueOld = asset.holdings * asset.averagePrice;
      const totalValueNew = qtyNum * priceNum;
      newAvgPrice = (totalValueOld + totalValueNew) / newHoldings;
    } else if (newHoldings <= 0) {
      newHoldings = 0;
      newAvgPrice = 0;
    }

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          assetId: asset.id,
          type: transType,
          quantity: qtyNum,
          price: priceNum,
          date: date ? new Date(date) : new Date(),
        },
      }),
      prisma.asset.update({
        where: { id: asset.id },
        data: { holdings: newHoldings, averagePrice: newAvgPrice },
      }),
    ]);

    return NextResponse.json(await getAllAssets());
  } catch (error) {
    console.error('POST /api/portfolio error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// PATCH - edit holdings quantity directly
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, holdings } = body;

    if (!id || holdings === undefined) {
      return NextResponse.json({ error: 'Missing id or holdings' }, { status: 400 });
    }

    const holdingsNum = parseFloat(holdings);
    if (isNaN(holdingsNum) || holdingsNum < 0) {
      return NextResponse.json({ error: 'Invalid holdings value' }, { status: 400 });
    }

    await prisma.asset.update({
      where: { id },
      data: { holdings: holdingsNum },
    });

    return NextResponse.json(await getAllAssets());
  } catch (error) {
    console.error('PATCH /api/portfolio error:', error);
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
  }
}

// DELETE - remove an asset and all its transactions
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing asset id' }, { status: 400 });
    }

    // Delete transactions first (cascade), then asset
    await prisma.transaction.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });

    return NextResponse.json(await getAllAssets());
  } catch (error) {
    console.error('DELETE /api/portfolio error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
