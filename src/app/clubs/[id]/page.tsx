import { notFound, permanentRedirect } from "next/navigation";
import { EntityImage } from "@/components/EntityImage";
import Link from "next/link";
import { getClubById, getClubTransfers, getClubDisplayName, getClubSnapshots } from "@/lib/data/clubs";
import { getClubHonours } from "@/lib/data/honours";
import { getLeagueById } from "@/lib/data/leagues";
import { getFotmobTeamDetails } from "@/lib/fotmob/client";
import { FOTMOB_TEAM_MAPPINGS } from "@/lib/league-mappings";
import { formatCompactEur } from "@/lib/utils";
import { getClubSlug, getLeagueSlug } from "@/lib/slugs";
import { Users, Trophy, Globe, Clock } from "lucide-react";
import { ClubTabsContainer } from "@/components/ClubTabsContainer";
import { ClubHonoursBox } from "@/components/ClubHonoursBox";
import { RelatedNewsCard } from "@/components/news/RelatedNewsCard";
import { getRelatedNews } from "@/lib/data/news";
import { Card, ValuationFreshness, Breadcrumbs, PageHeader } from "@/components/ui";
import { FollowButton } from "@/components/watchlist/FollowButton";

import { constructMetadata, SITE_URL } from "@/lib/metadata";
import type { Metadata } from "next";
import { Money } from "@/components/ui/Money";

export const revalidate = 3600;
export const runtime = "edge";

interface ClubPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const league = await getLeagueById(params.id);
  if (league) {
    const canonicalSlug = getLeagueSlug(league);
    const rawLeagueTitle = `${league.name} clubs, players and market values | a1score`;
    const leagueDesc = `${league.name} standings, ${league.clubCount} clubs, top players, and squad market values. See table and financial analytics.`;
    return constructMetadata({
      title: rawLeagueTitle,
      description: leagueDesc.length > 155 ? leagueDesc.slice(0, 152) + "..." : leagueDesc,
      path: `/leagues/${canonicalSlug}`,
      image: league.logoUrl || undefined,
    });
  }

  const club = await getClubById(params.id);
  if (!club) {
    return constructMetadata({
      title: "Club Not Found | a1score",
      description: "The requested football club profile could not be located.",
      path: `/clubs/${params.id}`,
      noIndex: true,
    });
  }

  const formattedVal = club.totalSquadValue
    ? formatCompactEur(club.totalSquadValue)
    : "Valuation pending";
  const canonicalSlug = getClubSlug(club);
  const squadCount = club.squadSize || club.seniorSquad?.length || 0;

  const rawClubTitle = `${club.name} squad value, players and transfers | a1score`;
  const clubDesc = `${club.name} squad is valued at ${formattedVal}${squadCount ? ` with ${squadCount} players` : ""}. See squad value, player profiles, and transfer history.`;

  return constructMetadata({
    title: rawClubTitle,
    description: clubDesc.length > 155 ? clubDesc.slice(0, 152) + "..." : clubDesc,
    path: `/clubs/${canonicalSlug}`,
    image: `/clubs/${canonicalSlug}/opengraph-image`,
  });
}

export default async function ClubPage({ params }: ClubPageProps) {
  // If user requests a league alias or CUID under /clubs (e.g. /clubs/laliga or /clubs/serie-a), redirect to league page
  const league = await getLeagueById(params.id);
  if (league) {
    const canonicalLeagueSlug = getLeagueSlug(league);
    permanentRedirect(`/leagues/${canonicalLeagueSlug}`);
  }

  const club = await getClubById(params.id);

  if (!club) {
    notFound();
  }

  // 301 redirect any non-canonical slug, legacy CUID, or numeric ID to canonical slug URL
  const canonicalSlug = getClubSlug(club);
  if (params.id !== canonicalSlug) {
    permanentRedirect(`/clubs/${canonicalSlug}`);
  }

  // Find FotMob team ID
  let fotmobTeamId: number | null = null;
  const tmId = club.transfermarktId;
  for (const [fId, mapping] of Object.entries(FOTMOB_TEAM_MAPPINGS)) {
    if (mapping.tmId === tmId || mapping.name?.toLowerCase() === club.name?.toLowerCase()) {
      fotmobTeamId = Number(fId);
      break;
    }
  }

  const [transfersData, fotmobDetails, clubHonours, relatedNews, clubSnapshots] = await Promise.all([
    getClubTransfers(club.name),
    fotmobTeamId ? getFotmobTeamDetails(fotmobTeamId).catch(() => null) : Promise.resolve(null),
    getClubHonours(club.id),
    getRelatedNews([club.name, getClubDisplayName(club)], 3).catch(() => []),
    getClubSnapshots(club.id).catch(() => []),
  ]);

  const seniorSquad = club.firstTeamPlayers && club.firstTeamPlayers.length > 0
    ? club.firstTeamPlayers
    : club.players.filter((p: any) => p.tier !== "academy");

  const academySquad = club.academyPlayers || club.players.filter((p: any) => p.tier === "academy");

  const honoursAwards = (clubHonours || []).map((h) => `${h.titleCount}x ${h.competitionName}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: club.name,
    sport: "Football",
    logo: club.logoUrl || undefined,
    url: `${SITE_URL}/clubs/${canonicalSlug}`,
    mainEntityOfPage: `${SITE_URL}/clubs/${canonicalSlug}`,
    ...(club.country
      ? {
          location: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: club.country,
            },
          },
        }
      : {}),
    ...(club.transfermarktId
      ? {
          sameAs: [
            `https://www.transfermarkt.com/verein/spielplan/verein/${club.transfermarktId}`,
          ],
        }
      : {}),
    award: honoursAwards.length > 0 ? honoursAwards : undefined,
    memberOf: club.league
      ? {
          "@type": "SportsOrganization",
          name: club.league.name,
          url: `${SITE_URL}/leagues/${getLeagueSlug(club.league)}`,
        }
      : undefined,
    member: seniorSquad.slice(0, 30).map((p: any) => ({
      "@type": "Person",
      name: p.fullName,
      jobTitle: p.position,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Clubs", item: `${SITE_URL}/clubs` },
      { "@type": "ListItem", position: 3, name: club.name, item: `${SITE_URL}/clubs/${canonicalSlug}` },
    ],
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Clubs", href: "/clubs" },
    { label: club.name },
  ];

  return (
    <div className="space-y-4 max-w-[720px] mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Breadcrumbs items={breadcrumbItems} />

      {/* Club Header Card */}
      <PageHeader
        variant="club"
        imageUrl={club.logoUrl}
        imageAlt={club.name}
        entityType="club"
        imageShape="rounded"
        categoryLabel="Football Club"
        title={getClubDisplayName(club)}
        subtitle={
          club.name && club.name !== getClubDisplayName(club) ? club.name : undefined
        }
        value={<Money eur={club.totalSquadValue} />}
        valueLabel="Total Squad Valuation"
        freshnessTimestamp={
          club.lastSyncedAt ||
          seniorSquad[0]?.updatedAt ||
          seniorSquad[0]?.marketValues?.[0]?.date
        }
        metaItems={[
          club.country ? (
            <span key="country" className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              {club.country}
            </span>
          ) : null,
          club.league ? (
            <Link
              key="league"
              href={`/leagues/${club.league.id}`}
              className="flex items-center gap-1 font-semibold text-[var(--value-text)] hover:underline transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              {club.league.name}
            </Link>
          ) : null,
          <span key="squad" className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[var(--trend-positive)]" />
            {seniorSquad.length} Players
          </span>,
          club.averageAge ? (
            <span key="age" className="flex items-center gap-1 text-[var(--text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              {club.averageAge} yrs avg
            </span>
          ) : null,
        ].filter(Boolean)}
        extraContent={
          clubHonours && clubHonours.length > 0 ? (
            <ClubHonoursBox honours={clubHonours} clubName={getClubDisplayName(club)} />
          ) : null
        }
        actions={
          <FollowButton
            variant="button"
            id={club.id}
            type="club"
            name={club.name || getClubDisplayName(club)}
            slug={canonicalSlug}
            clubCrest={club.logoUrl}
            avatarUrl={club.logoUrl}
            marketValue={club.totalSquadValue}
          />
        }
        shareTitle={`${getClubDisplayName(club)} squad valuation & transfers | a1score`}
        shareUrl={`${SITE_URL}/clubs/${canonicalSlug}`}
      />

      {/* Multi-Tab Interactive Interface (Squad, Transfers, Value, Overview, Form) */}
      <ClubTabsContainer
        clubName={club.name}
        totalSquadValue={club.totalSquadValue}
        players={club.players}
        firstTeamPlayers={seniorSquad}
        academyPlayers={academySquad}
        details={fotmobDetails}
        transfersData={transfersData}
        leagueName={club.league?.name}
        snapshots={clubSnapshots}
      />

      {/* Related News Card */}
      {relatedNews && relatedNews.length > 0 && (
        <RelatedNewsCard items={relatedNews} title={`${getClubDisplayName(club)} news`} />
      )}
    </div>
  );
}
