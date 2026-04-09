# 💰 Wealthstack: Total Net Worth Tracker

**Wealthstack** is a comprehensive, omni-asset financial dashboard built for elite investors. It allows you to track all your financial assets in one unified **INR (₹)** based portfolio. The system calculates complex live metrics, foreign exchange conversions, and performance analytics natively on the fly.

---

## 🎯 Core Features

- **Universal Asset Engine**: Track Crypto, US Stocks, Indian Stocks (NSE/BSE), Mutual Funds, Cash, Real Estate, and Gold in one ledger.
- **Multi-Currency Intelligence**: Intelligent Auto-FX tracking. Native USD assets (like US Equities and Cryptocurrencies) seamlessly convert to local base INR live using Yahoo Finance API feeds. 
- **Advanced Graph System**: Recharts-powered interactive analytics. 
   - **Net Worth Trajectory**: A 1-year historic lookback area chart mapping your portfolio's historic worth.
   - **Allocation Visualizer**: Interactive Pie Chart plotting portfolio breadth.
- **Deep Performance Analytics**: Identifies your absolute best/worst portfolio performers and mathematically approximates your Compound Annual Growth Rate (CAGR).
- **Persistent Ledger**: Robust `SQLite` persistence mapped with Prisma allowing comprehensive Buy/Sell tracking and history retention.

---

## ⚙️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 (Dark Premium Trader-Grade UI)
- **Database**: SQLite with Prisma ORM
- **State Management**: Zustand
- **Charting**: Recharts
- **Live Data Streams**: CoinGecko (Crypto) & Yahoo Finance (Forex/Equities)

---

## 🚀 Getting Started

### 1. Database Setup
The architecture depends on a local SQLite Database for rapid persistence. Before starting the engine, sync the schema.

```bash
# Push database structure
npx prisma db push
```

### 2. Start the Engine
Run the development application server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start tracking your net worth.

---

## 🔐 Security & Deployment
Wealthstack processes APIs server-side natively using Next.js route handlers, ensuring you never leak private API keys to the client.

Ready to take your tracker online? 
Deploy this perfectly to [Vercel](https://vercel.com/) and automatically migrate your Prisma target to a Postgres Database via the `.env`.
