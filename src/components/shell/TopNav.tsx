"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  Radio,
  Users,
  Shield,
  Trophy,
  TrendingUp,
  ArrowLeftRight,
  Newspaper,
  Search,
  Star,
} from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLiveMatchCount } from "@/hooks/useLiveMatchCount";
import { OPEN_SEARCH_EVENT } from "@/lib/nav/search";
import { isUnder } from "@/lib/nav/config";

export interface NavItem {
  name: string;
  shortName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isLiveMatches?: boolean;
  isActive: (pathname: string, filter: string | null) => boolean;
}

export const CATEGORIES: NavItem[] = [
  {
    name: "Matches",
    shortName: "Matches",
    href: "/matches",
    icon: Radio,
    isLiveMatches: true,
    isActive: (p) => p === "/matches" || p.startsWith("/matches/") || p.startsWith("/match/"),
  },
  {
    name: "Players",
    shortName: "Players",
    href: "/players",
    icon: Users,
    isActive: (p) => p === "/players" || p.startsWith("/players/") || p.startsWith("/player/"),
  },
  {
    name: "Clubs",
    shortName: "Clubs",
    href: "/clubs",
    icon: Shield,
    isActive: (p) => p === "/clubs" || p.startsWith("/clubs/") || p.startsWith("/club/"),
  },
  {
    name: "Leagues",
    shortName: "Leagues",
    href: "/leagues",
    icon: Trophy,
    isActive: (p) => p === "/leagues" || p.startsWith("/leagues/") || p.startsWith("/league/"),
  },
  {
    name: "Market Values",
    shortName: "Values",
    href: "/values",
    icon: TrendingUp,
    isActive: (p, f) => p === "/values" || (p === "/search" && f === "valuable"),
  },
  {
    name: "Transfers",
    shortName: "Transfers",
    href: "/transfers",
    icon: ArrowLeftRight,
    isActive: (p) => p === "/transfers" || p.startsWith("/transfers/") || p.startsWith("/transfer"),
  },
  {
    name: "News",
    shortName: "News",
    href: "/news",
    icon: Newspaper,
    isActive: (p) => p === "/news" || p.startsWith("/news/"),
  },
];

export const DRAWER_ITEMS = [
  {
    name: "Home",
    href: "/",
    icon: Radio,
    isActive: (p: string) => p === "/",
  },
  {
    name: "Live Matches",
    href: "/matches",
    icon: Radio,
    isLiveMatches: true,
    isActive: (p: string) => p === "/matches" || p.startsWith("/matches/") || p.startsWith("/match/"),
  },
  {
    name: "Players",
    href: "/players",
    icon: Users,
    isActive: (p: string) => p === "/players" || p.startsWith("/players/") || p.startsWith("/player/"),
  },
  {
    name: "Clubs",
    href: "/clubs",
    icon: Shield,
    isActive: (p: string) => p === "/clubs" || p.startsWith("/clubs/") || p.startsWith("/club/"),
  },
  {
    name: "Leagues",
    href: "/leagues",
    icon: Trophy,
    isActive: (p: string) => p === "/leagues" || p.startsWith("/leagues/") || p.startsWith("/league/"),
  },
  {
    name: "Market Values",
    href: "/values",
    icon: TrendingUp,
    isActive: (p: string, f: string | null) => p === "/values" || (p === "/search" && f === "valuable"),
  },
  {
    name: "Following",
    href: "/following",
    icon: Star,
    isActive: (p: string) => isUnder(p, "/following") || isUnder(p, "/watchlist"),
  },
  {
    name: "Transfers",
    href: "/transfers",
    icon: ArrowLeftRight,
    isActive: (p: string) => p === "/transfers" || p.startsWith("/transfers/") || p.startsWith("/transfer"),
  },
  {
    name: "News",
    href: "/news",
    icon: Newspaper,
    isActive: (p: string) => p === "/news" || p.startsWith("/news/"),
  },
];

function TopNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const liveCount = useLiveMatchCount();

  // Detect Mac OS for keyboard shortcut representation
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    const handleOpenSearch = () => setCommandPaletteOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, handleOpenSearch);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, handleOpenSearch);
    };
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full bg-bg-page/90 backdrop-blur-xl border-b border-[var(--divider)] transition-colors"
        style={{
          height: "calc(var(--nav-height) + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-[var(--container-max)] mx-auto px-4 lg:px-6 h-full flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="a1score.app home"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-black text-base sm:text-lg shadow-sm">
                A1
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center">
                a1score<span className="text-[var(--accent)]">.app</span>
              </span>
            </Link>
          </div>

          {/* Center / Desktop Nav Links: Bold text links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden xl:flex items-center gap-1 2xl:gap-2 text-sm font-bold"
          >
            {CATEGORIES.map((cat) => {
              const active = cat.isActive(pathname, filterParam);
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.href}
                  href={cat.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    active
                      ? "text-[var(--accent)] bg-[var(--bg-chip)] font-bold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] font-semibold"
                  }`}
                >
                  <span className="relative flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                    {cat.isLiveMatches && liveCount !== null && liveCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--live)] animate-ping" />
                    )}
                  </span>
                  {/* Short labels until 2xl so seven items + search fit on one line at 1280px */}
                  <span className="2xl:hidden">{cat.shortName}</span>
                  <span className="hidden 2xl:inline">{cat.name}</span>
                  {cat.isLiveMatches && liveCount !== null && liveCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-chip)] text-[var(--live)]">
                      {liveCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Pill Search + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop Pill Search with Ctrl+K Hint */}
            <button
              type="button"
              data-search-trigger="desktop"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-3 px-3.5 py-2 rounded-[var(--chip-radius)] bg-[var(--bg-chip)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-xs font-medium cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] min-w-[200px] lg:min-w-[240px] justify-between"
              aria-label="Search players, clubs, leagues"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">Search database...</span>
              </div>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] rounded shadow-xs shrink-0">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            {/* Mobile / Compact Search Icon Button */}
            <button
              type="button"
              data-search-trigger="compact"
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Search players, clubs, leagues"
              title="Search (Ctrl+K)"
            >
              <Search className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}

export function TopNav() {
  return (
    <Suspense
      fallback={
        <header
          className="sticky top-0 z-40 w-full bg-bg-page/90 backdrop-blur-xl border-b border-[var(--divider)]"
          style={{ height: "calc(var(--nav-height) + env(safe-area-inset-top))" }}
        />
      }
    >
      <TopNavContent />
    </Suspense>
  );
}
