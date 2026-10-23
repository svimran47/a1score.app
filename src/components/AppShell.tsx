import React from "react";
import { headers } from "next/headers";
import { getLeagues } from "@/lib/data/leagues";
import { getMarketValueMovers } from "@/lib/data/players";
import { getNews } from "@/lib/data/news";
import { TopNav } from "@/components/shell/TopNav";
import { LeftRail } from "@/components/shell/LeftRail";
import { TabletLeaguesScroller } from "@/components/shell/TabletLeaguesScroller";
import { RightRail } from "@/components/shell/RightRail";
import { BottomNav } from "@/components/shell/BottomNav";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { Footer } from "@/components/Footer";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [leagues, movers, news] = await Promise.all([
    getLeagues().catch(() => []),
    getMarketValueMovers(5).catch(() => ({ risers: [], fallers: [] })),
    getNews().then((items) => items.slice(0, 4)).catch(() => []),
  ]);

  return (
    // Bottom padding keeps the last content (rail or footer) clear of the fixed BottomNav below lg
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Accessible skip-to-content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-[var(--accent-contrast)] focus:rounded-[var(--chip-radius)] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm font-semibold"
      >
        Skip to content
      </a>

      {/* Small non-overlapping PWA banner */}
      <PwaInstallPrompt />

      {/* 72px FotMob-style Sticky Top Navigation */}
      <TopNav />

      {/* Centered Main Shell Container (max-width: 1280px) */}
      <div className="w-full max-w-[var(--container-max)] mx-auto px-4 lg:px-6 py-4 sm:py-6 flex-1">
        {/* Tablet Leagues Scroller (480px to 1023px) */}
        <TabletLeaguesScroller leagues={leagues} />

        {/* Responsive Grid: 3-column desktop (260px 1fr 320px, gap 16px) */}
        <div className="lg:grid lg:grid-cols-[var(--rail-left)_1fr_var(--rail-right)] lg:gap-[var(--gap)] items-start">
          {/* Left Rail (Desktop >= 1024px) */}
          <LeftRail leagues={leagues} />

          {/* Center Column: Primary Page Content */}
          <main id="main-content" className="@container/main min-w-0 flex-1 w-full">
            {children}
          </main>

          {/* Right Rail: third grid column on desktop, stacked below content on
              mobile & tablet. Rendered once so its widgets hydrate once. */}
          <div className="mt-8 lg:mt-0 min-w-0 shrink-0 pb-8">
            <RightRail movers={movers} news={news} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Fixed Bottom Navigation for phones and tablets (< 1024px) */}
      <BottomNav />
    </div>
  );
}
