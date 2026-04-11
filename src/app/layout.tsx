import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Folio — Total Net Worth Tracker",
  description: "Folio — Track every asset in one place. Stocks, crypto, mutual funds, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} style={{ height: "100dvh", overflow: "hidden" }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
