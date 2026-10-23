import { getLeagues } from "@/lib/data/leagues";
import { LeaguesDirectoryClient } from "@/components/LeaguesDirectoryClient";

import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { getLeagueSlug } from "@/lib/slugs";
import type { Metadata } from "next";

export const revalidate = 3600;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Top 7 European Football Leagues — Standings & Market Valuations",
  description:
    "Club valuations and league standings across Europe's top 7 domestic competitions: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Liga Portugal, and Eredivisie on a1score.app.",
  path: "/leagues",
});

export default async function LeaguesPage() {
  const leagues = await getLeagues();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Leagues", item: `${SITE_URL}/leagues` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top European Football Leagues",
    itemListElement: (leagues || []).map((l: any, idx: number) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: l.name,
      url: `${SITE_URL}/leagues/${getLeagueSlug(l)}`,
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
      <LeaguesDirectoryClient initialLeagues={leagues} />
    </>
  );
}
