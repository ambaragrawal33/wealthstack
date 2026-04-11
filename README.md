# Folio — Total Net Worth Tracker

A professional-grade, multi-asset portfolio dashboard that tracks every financial holding in one place — Indian stocks, US equities, crypto, ETFs, mutual funds, metals, and more.

Built with Next.js 16, Prisma, and live market feeds. Dark & light mode. Desktop-first design.

---

## Features

### Portfolio Management
- **Multi-asset support** — Track Indian stocks (NSE/BSE), US equities, crypto, ETFs, mutual funds, cash, real estate, gold
- **4 portfolio segments** — Total Portfolio, 🇮🇳 Indian Stocks, 🇺🇸 US Stocks, 🪙 Crypto — each with its own chart, stats, and table
- **INR ↔ USD toggle** — Switch display currency on any segment; values, prices, and charts convert in real-time
- **Inline edit & delete** — Hover any holding row to edit quantity or remove it instantly
- **Live price polling** — Prices refresh every 15s with a visible sync indicator
- **Auto FX conversion** — USD/INR rate fetched live from Yahoo Finance

### Data Visualization
- **Net worth history chart** — 1M / 3M / 6M / 1Y range selector with area chart and tooltip
- **Per-segment charts** — Each segment (India/US/Crypto) renders its own independent historical chart
- **Allocation pie chart** — Visual breakdown by asset type
- **Performance analytics** — Best/worst performers, CAGR approximation

### Global Search
- **⌘K search modal** — Search any asset worldwide: stocks, crypto, ETFs, metals, currencies
- **Multi-source** — Yahoo Finance for equities, CoinGecko for crypto
- **Type filters** — 🇺🇸 US Stocks, 🇮🇳 Indian, 🪙 Crypto, 📈 Funds
- **Live results** — Price, 24h change, exchange info, and company logo displayed instantly

### Watchlist
- **Persistent sidebar** — Bookmark any ticker to track live prices
- **30s price polling** — Watchlist prices update independently
- **localStorage persistence** — Survives page reloads without DB overhead

### Market Strip
- **Live ticker tape** — Scrolling display of Nifty 50, Sensex, S&P 500, Gold, Bitcoin, USD/INR
- **Auto-updating** — Refreshes alongside portfolio price polling

### Asset Logos
- **Automatic logo detection** — No manual setup needed
- **Parqet** for US/global stocks, **cryptocurrency-icons CDN** for 1000+ coins
- **Multi-fallback chain** — Tries multiple sources, falls back to colored initials avatar

### Settings
- **Dark / Light mode** — Toggle via ☀️/🌙 button or Settings panel, persists in localStorage
- **Price refresh interval** — Choose 10s / 15s / 30s / 60s
- **CSV export** — Download all holdings as a spreadsheet
- **Base currency display** — Currently fixed to INR with USD toggle per segment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | CSS Variables + Tailwind CSS v4 |
| Database | SQLite + Prisma ORM |
| State | Zustand |
| Charts | Recharts |
| Live Data | Yahoo Finance (`yahoo-finance2` v3), CoinGecko API |
| Logos | Parqet, Clearbit, cryptocurrency-icons CDN |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Clone
git clone https://github.com/ambaragrawal33/folio.git
cd folio

# Install dependencies
npm install

# Initialize database
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start tracking.

### Adding Holdings
1. Click **Add Holding** in the top-right
2. Select asset type (Crypto / Indian Stock / US Stock / MF / etc.)
3. Search by name or ticker — select from the dropdown
4. Enter quantity → submit
5. The dashboard updates with live prices automatically

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── history/     # Historical price data (chart)
│   │   ├── portfolio/   # CRUD for holdings
│   │   ├── prices/      # Live price polling
│   │   ├── search/      # Global asset search
│   │   └── transactions/# Transaction ledger
│   ├── globals.css      # Design system (dark/light CSS vars)
│   ├── layout.tsx       # Root layout + ThemeProvider
│   └── page.tsx         # Main page composition
├── components/
│   ├── charts/          # AdvancedNetWorthChart, AllocationChart
│   ├── views/           # TransactionsTable, PerformanceAnalytics
│   ├── AssetLogo.tsx    # Smart logo with multi-source fallback
│   ├── Dashboard.tsx    # Main dashboard with segments
│   ├── GlobalSearch.tsx # ⌘K search modal
│   ├── GlobalSearchWrapper.tsx # Top navbar + brand
│   ├── HoldingsInput.tsx# Add holding form
│   ├── MarketStrip.tsx  # Scrolling ticker tape
│   ├── ThemeProvider.tsx# Dark/light mode context
│   └── WatchlistSidebar.tsx # Left sidebar watchlist
├── lib/
│   ├── portfolioEngine.ts # Value calculations, FX conversion
│   └── prisma.ts        # Prisma client singleton
├── store/
│   └── usePortfolioStore.ts # Zustand global state
└── prisma/
    └── schema.prisma    # Database schema
```

---

## Deployment

Deploy to [Vercel](https://vercel.com/) with zero config. For production, swap SQLite for PostgreSQL by updating `prisma/schema.prisma` and setting `DATABASE_URL` in your environment.

---

## License

MIT
