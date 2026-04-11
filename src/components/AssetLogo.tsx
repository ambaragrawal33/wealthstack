"use client";

import { useState } from "react";

interface AssetLogoProps {
  logo?: string | null;
  symbol: string;
  size?: number; // px
  className?: string;
}

export function AssetLogo({ logo, symbol, size = 28, className = "" }: AssetLogoProps) {
  const [imgError, setImgError] = useState(false);
  const initials = symbol.replace(/\.[A-Z]+$/, "").slice(0, 2).toUpperCase();
  const showImg = !!logo && !imgError;

  // Deterministic pastel color based on symbol
  const colors = [
    ["#1d4ed8", "#dbeafe"], // blue
    ["#7c3aed", "#ede9fe"], // violet
    ["#059669", "#d1fae5"], // green
    ["#d97706", "#fef3c7"], // amber
    ["#dc2626", "#fee2e2"], // red
    ["#0891b2", "#cffafe"], // cyan
    ["#9333ea", "#f3e8ff"], // purple
    ["#0d9488", "#ccfbf1"], // teal
  ];
  const idx = symbol.charCodeAt(0) % colors.length;
  const [textColor, bgColor] = colors[idx];

  return (
    <div
      className={`shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: showImg ? "transparent" : bgColor }}
    >
      {showImg ? (
        <img
          src={logo!}
          alt={symbol}
          width={size}
          height={size}
          onError={() => setImgError(true)}
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
