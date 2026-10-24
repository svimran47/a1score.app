import { notFound, permanentRedirect } from "next/navigation";
import { getLeagueById } from "@/lib/data/leagues";
import { formatDate } from "@/lib/utils";
import { getLeagueSlug, getClubSlug } from "@/lib/slugs";

import { LeagueFinancialParity } from "@/components/LeagueFinancialParity";
import { LeagueStandingsTable } from "@/components/LeagueStandingsTable";
import { LeagueLeaders } from "@/components/LeagueLeaders";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { FollowButton } from "@/components/watchlist/FollowButton";
import type { Metadata } from "next";
import { Money } from "@/components/ui/Money";

export const revalidate = 3600;
export const runtime = "edge";

interface LeaguePageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await getLeagueById(params.id);
  if (!league) {
    return constructMetadata({
      title: "Competition Not Found | a1score",
      description: "The requested football competition could not be located.",
      path: `/leagues/${params.id}`,
      noIndex: true,
    });
  }

  const canonicalSlug = getLeagueSlug(league);
  const rawTitle = `${league.name} clubs, players and market values | a1score`;
  const desc = `${league.name} standings, ${league.clubCount} clubs, top players, and squad market values. See table and financial analytics.`;

  return constructMetadata({
    title: rawTitle,
    description: desc.length > 155 ? desc.slice(0, 152) + "..." : desc,
    path: `/leagues/${canonicalSlug}`,
    image: league.logoUrl || undefined,
  });
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const league = await getLeagueById(params.id);

  if (!league) {
    return notFound();
  }

  // 301 redirect any non-canonical slug, legacy CUID, or alias to canonical slug URL (G1)
  const canonicalSlug = getLeagueSlug(league);
  if (params.id !== canonicalSlug) {
    permanentRedirect(`/leagues/${canonicalSlug}`);
  }

  const totalLeagueValue = league.clubs.reduce((acc, c) => acc + c.totalSquadValue, 0);
  const hasStandings = league.standings && league.standings.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: league.name,
    sport: "Football",
    url: `${SITE_URL}/leagues/${canonicalSlug}`,
    mainEntityOfPage: `${SITE_URL}/leagues/${canonicalSlug}`,
    description: `${league.name} standings, clubs, top players, and squad market values on a1score.`,
    subOrganization: league.clubs?.slice(0, 30).map((c) => ({
      "@type": "SportsTeam",
      name: c.name,
      url: `${SITE_URL}/clubs/${getClubSlug(c)}`,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Leagues", item: `${SITE_URL}/leagues` },
      { "@type": "ListItem", position: 3, name: league.name, item: `${SITE_URL}/leagues/${canonicalSlug}` },
    ],
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Leagues", href: "/leagues" },
    { label: league.name },
  ];

  return (
    <div className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Breadcrumbs items={breadcrumbItems} />

      {/* League Header */}
      <PageHeader
        variant="league"
        imageUrl={league.logoUrl}
        imageAlt={league.name}
        entityType="league"
        imageShape="rounded"
        categoryLabel={`${league.country} • Tier ${league.tier || 1}`}
        title={league.name}
        value={<Money eur={totalLeagueValue} />}
        valueLabel="Total Competition Value"
        metaItems={[
          <span key="clubs">{league.clubCount} Clubs</span>,
          <span key="season">Season {league.season || "2026/2027"}</span>,
          league.lastUpdated ? (
            <time key="updated" dateTime={new Date(league.lastUpdated).toISOString()} suppressHydrationWarning>
              Updated {formatDate(league.lastUpdated)}
            </time>
          ) : null,
        ].filter(Boolean)}
        actions={
          <FollowButton
            variant="button"
            id={league.id}
            type="league"
            name={league.name}
            slug={canonicalSlug}
            avatarUrl={league.logoUrl}
          />
        }
        shareTitle={`${league.name} standings & valuations | a1score`}
        shareUrl={`${SITE_URL}/leagues/${canonicalSlug}`}
      />

      {/* Financial Parity & Disparity Barometer */}
      <LeagueFinancialParity
        clubs={league.clubs}
        standings={league.standings || []}
        totalLeagueValue={totalLeagueValue}
        leagueName={league.name}
      />

      {/* Unified Standings & Squad Valuation Table (F1 & F3) */}
      {hasStandings && (
        <LeagueStandingsTable
          standings={league.standings}
          leagueName={league.name}
          season={league.season}
          legend={league.legend}
        />
      )}

      {/* League Leaders & Quick Switcher to Other European Leagues (F5) */}
      <LeagueLeaders
        topScorers={league.topScorers || []}
        topAssists={league.topAssists || []}
        otherLeagues={league.otherLeagues || []}
        currentLeagueId={league.id}
        season={league.season}
      />

      {/* Transparent Data Attribution Footer */}
      <div className="text-center text-xs text-[var(--text-muted)] py-2 space-y-1">
        <p>
          Data sources: FotMob match engine & Transfermarkt squad market valuations.
        </p>
        <p className="text-[11px] text-[var(--text-muted)] opacity-80">
          Standings and form reflect the active 2026/2027 domestic season.
        </p>
      </div>
    </div>
  );
}
