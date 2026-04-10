import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wealthstack — Total Net Worth Tracker",
  description: "Professional portfolio tracker for stocks, crypto, mutual funds, and more. INR-based dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`} style={{ height: '100dvh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
