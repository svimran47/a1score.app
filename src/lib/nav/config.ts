/**
 * Navigation information architecture — the single source of truth for the
 * mobile bottom bar, the desktop sidebar and the More hub.
 *
 * Pure data + pure predicates (no React, no "use client") so the same
 * definitions can be unit-tested and imported from server and client code.
 * Icons are referenced by key and resolved to lucide components in the UI.
 */

export type NavIconKey =
  | "matches"
  | "news"
  | "leagues"
  | "following"
  | "more"
  | "values"
  | "transfers"
  | "compare"
  | "players"
  | "clubs"
  | "notifications"
  | "settings"
  | "tv"
  | "predict"
  | "lineup";

export interface BottomTab {
  key: "matches" | "news" | "leagues" | "following" | "more";
  label: string;
  href: string;
  icon: NavIconKey;
  /** Shows the live-match badge on this tab. */
  showsLiveCount?: boolean;
  isActive: (pathname: string) => boolean;
}

/** True when `pathname` is `base` itself or any route nested below it. */
export function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Routes that live behind the More tab: highlighting More there tells the
// user where they are, just like FotMob does for Settings or Transfer Centre.
const MORE_ROUTES = [
  "/more",
  "/settings",
  "/values",
  "/rankings",
  "/transfers",
  "/tv",
  "/compare",
  "/predict",
  "/lineup-builder",
  "/players",
  "/clubs",
  "/privacy",
  "/terms",
];

export const BOTTOM_TABS: BottomTab[] = [
  {
    key: "matches",
    label: "Matches",
    href: "/matches",
    icon: "matches",
    showsLiveCount: true,
    isActive: (p) => p === "/" || isUnder(p, "/matches") || isUnder(p, "/match"),
  },
  {
    key: "news",
    label: "News",
    href: "/news",
    icon: "news",
    isActive: (p) => isUnder(p, "/news"),
  },
  {
    key: "leagues",
    label: "Leagues",
    href: "/leagues",
    icon: "leagues",
    isActive: (p) => isUnder(p, "/leagues") || isUnder(p, "/league"),
  },
  {
    key: "following",
    label: "Following",
    href: "/following",
    icon: "following",
    isActive: (p) => isUnder(p, "/following") || isUnder(p, "/watchlist"),
  },
  {
    key: "more",
    label: "More",
    href: "/more",
    icon: "more",
    isActive: (p) => MORE_ROUTES.some((base) => isUnder(p, base)),
  },
];

/** The single bottom tab that should be highlighted for a route (or null). */
export function getActiveBottomTab(pathname: string): BottomTab["key"] | null {
  return BOTTOM_TABS.find((t) => t.isActive(pathname))?.key ?? null;
}

export interface MoreItem {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon: NavIconKey;
}

/** Feature rows on the More hub, in display order. */
export const MORE_FEATURES: MoreItem[] = [
  {
    key: "values",
    label: "Market Values",
    description: "Most valuable players and biggest value movers",
    href: "/values",
    icon: "values",
  },
  {
    key: "rankings",
    label: "Rankings",
    description: "Most valuable players by league, position, age and nation",
    href: "/rankings",
    icon: "values",
  },
  {
    key: "transfers",
    label: "Transfer Centre",
    description: "Latest confirmed transfers, loans and fees",
    href: "/transfers",
    icon: "transfers",
  },
  {
    key: "tv",
    label: "TV schedules",
    href: "/tv",
    icon: "tv",
  },
  {
    key: "compare",
    label: "Compare Players",
    description: "Put up to three players side by side",
    href: "/compare",
    icon: "compare",
  },
  {
    key: "predict",
    label: "Match Predictor",
    description: "Predict match scores and compete on the leaderboard",
    href: "/predict",
    icon: "predict",
  },
  {
    key: "lineup",
    label: "Lineup Builder",
    description: "Build your dream XI and calculate squad valuation",
    href: "/lineup-builder",
    icon: "lineup",
  },
  {
    key: "players",
    label: "Players",
    description: "Browse every player in the database",
    href: "/players",
    icon: "players",
  },
  {
    key: "clubs",
    label: "Clubs",
    description: "Squads and squad valuations",
    href: "/clubs",
    icon: "clubs",
  },
];

export const MORE_ACCOUNT: MoreItem[] = [
  {
    key: "notifications",
    label: "Notifications",
    description: "Manage alerts for the teams, players and leagues you follow",
    href: "/settings/notifications",
    icon: "notifications",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings",
  },
];
