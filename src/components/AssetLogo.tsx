"use client";

import { useState } from "react";

interface AssetLogoProps {
  logo?: string | null;     // Explicit logo URL (from search API)
  symbol: string;           // Ticker symbol (e.g. AAPL, bitcoin, GOLDBEES.NS)
  type?: string;            // STOCK, US_STOCK, CRYPTO, MF etc.
  size?: number;
  className?: string;
}

/** Derive logo URLs to try based on symbol / type */
function getLogoUrls(symbol: string, type?: string, explicitLogo?: string | null): string[] {
  const urls: string[] = [];

  // Explicit logo from search API — highest priority
  if (explicitLogo) urls.push(explicitLogo);

  const base = symbol.replace(/\.(NS|BO|L|TO|AX|SI|KL|BK|SS|SH|HK|T|PA|F|DE|BE|AS|BR|TW|NZ|AT|CO|MI|OL|ST|SW|PR|MC|VX|SN|MX|BA|SA|MA|IL|QA|AE|BH|KW|EG|OM|ZA|NG|GH)$/i, "");

  if (type === "CRYPTO") {
    // CoinGecko ID → ticker mapping for common coins
    const cgToTicker: Record<string, string> = {
      bitcoin: "btc", ethereum: "eth", ripple: "xrp", solana: "sol",
      dogecoin: "doge", cardano: "ada", polkadot: "dot", litecoin: "ltc",
      "shiba-inu": "shib", "binancecoin": "bnb", avalanche: "avax",
      chainlink: "link", polygon: "matic", uniswap: "uni", cosmos: "atom", stellar: "xlm", monero: "xmr", "bitcoin-cash": "bch", "ethereum-classic": "etc",
      tron: "trx", filecoin: "fil", "terra-luna-classic": "lunc",
      aptos: "apt", arbitrum: "arb", optimism: "op", near: "near",
      "internet-computer": "icp", "the-graph": "grt", aave: "aave",
      maker: "mkr", compound: "comp", "pancakeswap-token": "cake",
      "crypto-com-chain": "cro", vechain: "vet", tezos: "xtz",
      eos: "eos", iota: "miota", dash: "dash", zcash: "zec",
      "wrapped-bitcoin": "wbtc", "usd-coin": "usdc", tether: "usdt",
    };

    const lower = base.toLowerCase();
    const ticker = cgToTicker[lower] ?? lower;

    // Cryptocurrency icons from CDN (covers 1000+ coins)
    urls.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${ticker}.png`);
    urls.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${lower}.png`);

    // CoinGecko small image CDN (works if symbol IS the coingecko slug)
    // Note: this is a guess-URL, won't always work
    return urls;
  }

  // For stocks/ETFs:
  // 1. Parqet has good coverage for US & some global stocks
  urls.push(`https://assets.parqet.com/logos/symbol/${base}?format=png`);
  // 2. Clearbit by guessing domain (company.com pattern)
  urls.push(`https://logo.clearbit.com/${base.toLowerCase()}.com`);

  return urls;
}

/** Deterministic color avatar as fallback */
function getAvatarColors(symbol: string): [string, string] {
  const palettes: [string, string][] = [
    ["#1d4ed8", "#dbeafe"],
    ["#7c3aed", "#ede9fe"],
    ["#059669", "#d1fae5"],
    ["#d97706", "#fef3c7"],
    ["#dc2626", "#fee2e2"],
    ["#0891b2", "#cffafe"],
    ["#9333ea", "#f3e8ff"],
    ["#0d9488", "#ccfbf1"],
    ["#b45309", "#fef3c7"],
    ["#db2777", "#fce7f3"],
  ];
  return palettes[symbol.charCodeAt(0) % palettes.length];
}

export function AssetLogo({ logo, symbol, type, size = 28, className = "" }: AssetLogoProps) {
  const urls = getLogoUrls(symbol, type, logo);
  const [urlIndex, setUrlIndex] = useState(0);
  const showImg = urlIndex < urls.length;

  const initials = symbol.replace(/\.(NS|BO|L|TO)$/i, "").slice(0, 2).toUpperCase();
  const [textColor, bgColor] = getAvatarColors(symbol);

  const handleError = () => {
    setUrlIndex(i => i + 1);
  };

  return (
    <div
      className={`shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: showImg ? "transparent" : bgColor }}
    >
      {showImg ? (
        <img
          key={urls[urlIndex]}
          src={urls[urlIndex]}
          alt={symbol}
          width={size}
          height={size}
          onError={handleError}
          style={{ width: size, height: size, objectFit: "contain" }}
          loading="lazy"
        />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 700, color: textColor }}>
          {initials}
        </span>
      )}
    </div>
  );
}
