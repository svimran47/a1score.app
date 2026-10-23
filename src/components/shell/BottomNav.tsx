"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveMatchCount } from "@/hooks/useLiveMatchCount";
import { BOTTOM_TABS, getActiveBottomTab } from "@/lib/nav/config";
import { NAV_ICONS } from "@/components/shell/navIcons";

// Icons that read as "selected" when filled, FotMob style. Line icons such as
// Radio or Menu have no meaningful fill, so they rely on colour and weight.
const FILLABLE = new Set(["following", "leagues"]);

/**
 * Mobile/tablet bottom bar: Matches · News · Leagues · Following · More.
 * Every tab is a real link (More opens the /more hub page rather than a
 * sheet), so back/forward, deep links and middle-click all behave.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const liveCount = useLiveMatchCount();
  const activeKey = getActiveBottomTab(pathname);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-bg-card/95 border-t border-[var(--divider)] backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5 h-14 items-stretch max-w-xl mx-auto">
        {BOTTOM_TABS.map((tab) => {
          const Icon = NAV_ICONS[tab.icon];
          const active = activeKey === tab.key;
          const showLive = tab.showsLiveCount && liveCount != null && liveCount > 0;

          return (
            <li key={tab.key} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.key === "more" ? "More features and settings" : tab.label}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] ${
                  active
                    ? "text-[var(--text-primary)] font-bold"
                    : "text-[var(--text-muted)] font-medium hover:text-[var(--text-primary)]"
                }`}
              >
                {/* Active indicator bar, so selection never relies on colour alone */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${
                    active ? "bg-[var(--accent)] opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative flex items-center justify-center">
                  <Icon
                    aria-hidden="true"
                    className={`w-[22px] h-[22px] ${active ? "text-[var(--accent)]" : ""} ${
                      active && FILLABLE.has(tab.key) ? "fill-current" : ""
                    }`}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {showLive && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-[var(--accent-contrast)] bg-[var(--live)] flex items-center justify-center leading-none tabular-nums">
                      {liveCount}
                      <span className="sr-only"> live</span>
                    </span>
                  )}
                </span>
                <span className="tracking-tight leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
