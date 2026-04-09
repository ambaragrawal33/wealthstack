import { formatCurrency, formatNumber } from "@/lib/utils";

// New specialized utility for INR currency
export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Convert USD to INR if necessary
export function calcAssetCurrentValueINR(
   holdings: number, 
   nativePrice: number, 
   currency: string, 
   usdInrRate: number
) {
   if (currency === 'USD') {
       return holdings * nativePrice * usdInrRate;
   }
   return holdings * nativePrice;
}

// Format changes beautifully
export function calcAsset24hChange(
    nativePrice: number,
    changePercent: number,
    currency: string,
    usdInrRate: number
) {
    if (!nativePrice || !changePercent) return 0;
    if (currency === 'USD') {
        const usdValueChange = nativePrice - (nativePrice / (1 + changePercent/100));
        return usdValueChange * usdInrRate; 
    } else {
        return nativePrice - (nativePrice / (1 + changePercent/100));
    }
}

// Advanced Portfolio Engine Metrics

// Calculates approximate CAGR (Compound Annual Growth Rate)
// Formula: (Current Value / Invested Value) ^ (1 / Years) - 1
export function calcCAGR(investedValue: number, currentValue: number, years: number): number {
    if (investedValue <= 0 || years <= 0) return 0;
    return (Math.pow(currentValue / investedValue, 1 / years) - 1) * 100;
}

// Basic Volatility Approximation using Standard Deviation of sparkline/historical prices
export function calcVolatility(pricesList: number[]): number {
    if (!pricesList || pricesList.length < 2) return 0;
    const mean = pricesList.reduce((a, b) => a + b, 0) / pricesList.length;
    const variance = pricesList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pricesList.length;
    const stdDev = Math.sqrt(variance);
    // Return relative volatility (%)
    return (stdDev / mean) * 100;
}

