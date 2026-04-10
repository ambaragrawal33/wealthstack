import { Dashboard } from "@/components/Dashboard";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { MarketStrip } from "@/components/MarketStrip";
import { GlobalSearchWrapper } from "@/components/GlobalSearchWrapper";

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Top brand + global search bar */}
      <GlobalSearchWrapper />
      {/* Scrolling market strip */}
      <MarketStrip />
      {/* Main app: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WatchlistSidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}
