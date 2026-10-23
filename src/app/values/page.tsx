import { Suspense } from "react";
import { getMostValuablePlayers, getMarketValueMovers } from "@/lib/data/players";
import { PlayersDirectoryClient } from "@/components/PlayersDirectoryClient";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { getPlayerSlug } from "@/lib/slugs";
import type { Metadata } from "next";

export const revalidate = 3600;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Most valuable football players | a1score",
  description:
    "Browse the most valuable football players worldwide, latest market value updates, top risers, and financial rankings on a1score.",
  path: "/values",
});

export default async function MarketValuesPage() {
  const [players, movers] = await Promise.all([
    getMostValuablePlayers(100).catch(() => []),
    getMarketValueMovers(6).catch(() => ({ risers: [], fallers: [] })),
  ]);

  const latestTimestamp = players.reduce<Date | null>((max, p: any) => {
    const raw = p.updatedAt || p.marketValues?.[p.marketValues?.length - 1]?.date;
    if (!raw) return max;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return max;
    return !max || d > max ? d : max;
  }, null);

  const latestRevisionDate = latestTimestamp
    ? latestTimestamp.toISOString()
    : players.length > 0
    ? new Date().toISOString()
    : undefined;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Market Values", item: `${SITE_URL}/values` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Most Valuable Football Players Worldwide",
    itemListElement: players.slice(0, 20).map((p: any, idx: number) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: p.fullName || p.commonName,
      url: `${SITE_URL}/players/${getPlayerSlug(p)}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Suspense
        fallback={
          <div className="rounded-[var(--card-radius)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)] text-sm">
            Loading market valuations...
          </div>
        }
      >
        <PlayersDirectoryClient
          initialPlayers={players}
          movers={movers}
          latestRevisionDate={latestRevisionDate}
          pageTitle="Market Values"
          pageSubtitle="Worldwide player valuation rankings and movers"
        />
      </Suspense>
    </>
  );
}
