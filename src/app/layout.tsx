import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wealthstack — Total Net Worth Tracker",
  description: "Professional portfolio tracker for stocks, crypto, mutual funds, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} style={{ height: "100dvh", overflow: "hidden" }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
