"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const exploreLinks = [
  { label: "Matches", href: "/matches" },
  { label: "Players", href: "/players" },
  { label: "Clubs", href: "/clubs" },
  { label: "Leagues", href: "/leagues" },
  { label: "Market Values", href: "/values" },
  { label: "Rankings", href: "/rankings" },
  { label: "Transfers", href: "/transfers" },
  { label: "News", href: "/news" },
];

const topLeagues = [
  { label: "Premier League", href: "/leagues/premier-league-cmuihndux0003b23fizizm4a0" },
  { label: "La Liga", href: "/leagues/laliga-cmuihncv70001b23frvqgzdp6" },
  { label: "Serie A", href: "/leagues/serie-a-cmuihnegb0004b23fhslrse6b" },
  { label: "Bundesliga", href: "/leagues/bundesliga-cmuihneym0005b23fkpqbo0uj" },
  { label: "Ligue 1", href: "/leagues/ligue-1-cmuihnddf0002b23fskdzdx29" },
  { label: "Liga Portugal", href: "/leagues/liga-portugal-cmuihnfy10007b23f3j6km8jo" },
  { label: "Eredivisie", href: "/leagues/eredivisie-cmuihnffm0006b23feq78bq1b" },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--divider)] bg-bg-page/90 backdrop-blur-xl pt-6 sm:pt-8 pb-8 mt-12 sm:mt-16 text-[var(--text-secondary)] text-xs sm:text-sm">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 sm:gap-8 lg:gap-16 mb-6 sm:mb-8">
          {/* Brand Block */}
          <div className="w-full lg:max-w-sm flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-xs flex-shrink-0">
                <span className="font-black text-sm tracking-tighter">
                  A1
                </span>
              </div>
              <span className="font-bold tracking-tight text-[var(--text-primary)] flex items-center text-sm sm:text-base">
                a1score<span className="text-[var(--accent)]">.app</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
              Football platform synthesizing match events with player market valuation updates and transfer records.
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Data grounded in FotMob match feeds & Transfermarkt market data.
            </p>
          </div>

          {/* Explore & Top Leagues */}
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-6 sm:gap-8 lg:gap-16 w-full lg:w-auto">
            {/* Column 1: Explore */}
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] h-8 flex items-center">
                Explore
              </h4>
              <ul className="text-xs sm:text-sm space-y-0.5">
                {exploreLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="min-h-[44px] flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded px-1 -mx-1 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Top Leagues */}
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] h-8 flex items-center">
                Top competitions
              </h4>
              <ul className="text-xs sm:text-sm space-y-0.5">
                {topLeagues.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="min-h-[44px] flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded px-1 -mx-1 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom row: (c) 2026 a1score.app, plus legal links */}
        <div className="pt-4 sm:pt-6 border-t border-[var(--divider)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>© {currentYear} a1score.app. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <Link
              href="/privacy"
              className="min-h-[44px] flex items-center hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded px-1 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="min-h-[44px] flex items-center hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded px-1 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
