import { Suspense } from "react";
import { getMostValuablePlayers, getMarketValueMovers } from "@/lib/data/players";
import { PlayersDirectoryClient } from "@/components/PlayersDirectoryClient";

import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { getPlayerSlug } from "@/lib/slugs";
import type { Metadata } from "next";

export const revalidate = 3600;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football Players Directory — Top Market Valuations Worldwide",
  description:
    "Explore worldwide football player market valuations, career positions, age demographics, and valuation movements on a1score.app.",
  path: "/players",
});

export default async function PlayersPage() {
  const [players, movers] = await Promise.all([
    getMostValuablePlayers(100),
    getMarketValueMovers(6).catch(() => ({ risers: [], fallers: [] })),
  ]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Players", item: `${SITE_URL}/players` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top Football Players by Market Value",
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
          <div className="rounded-3xl glass-panel p-12 border border-divider text-center text-text-muted text-sm">
            Loading player valuations...
          </div>
        }
      >
        <PlayersDirectoryClient initialPlayers={players} movers={movers} />
      </Suspense>
    </>
  );
}
