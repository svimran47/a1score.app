import { notFound } from "next/navigation";
import { getMatchDetails } from "@/lib/fotmob/client";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { MatchCenterClient } from "@/components/MatchCenterClient";
import type { Metadata } from "next";

export const revalidate = 5; // Edge cache TTL 5s with stale-while-revalidate
export const runtime = "edge";

interface MatchPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const match = await getMatchDetails(params.id);
  if (!match) {
    return constructMetadata({
      title: "Match Not Found",
      description: "The requested football match could not be located.",
      path: `/matches/${params.id}`,
      noIndex: true,
    });
  }

  const home = match.teams?.home?.name || "Home Team";
  const away = match.teams?.away?.name || "Away Team";
  const scoreStr = match.status?.started
    ? `${match.teams?.home?.score ?? 0} - ${match.teams?.away?.score ?? 0}`
    : "vs";
  const statusStr = match.status?.finished
    ? "Full Time"
    : match.status?.isLive
    ? "LIVE"
    : "Upcoming";

  return constructMetadata({
    title: `${home} ${scoreStr} ${away} — Live Match (${statusStr})`,
    description: `Live match scores and stats for ${home} ${scoreStr} ${away}. Live scorecard, scorers, confirmed lineups, tactical formations, live match timeline, and squad market valuations on a1score.app.`,
    path: `/matches/${params.id}`,
    image: `/matches/${params.id}/opengraph-image`,
  });
}

export default async function MatchDetailsPage({ params }: MatchPageProps) {
  const match = await getMatchDetails(params.id);

  if (!match) {
    notFound();
  }

  const matchAny = match as any;
  const { general = {}, teams = {}, status = {} } = matchAny;
  const homeTeam = teams?.home || {};
  const awayTeam = teams?.away || {};
  const matchTitle = `${homeTeam?.name || "Home"} vs ${awayTeam?.name || "Away"}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: matchTitle,
    sport: "Football",
    url: `${SITE_URL}/matches/${params.id}`,
    mainEntityOfPage: `${SITE_URL}/matches/${params.id}`,
    description: `Live match scores and stats for ${matchTitle} on a1score.`,
    startDate: general?.matchTimeUTCDate || undefined,
    eventStatus: status?.finished
      ? "https://schema.org/EventFinished"
      : status?.isLive
      ? "https://schema.org/EventLive"
      : "https://schema.org/EventScheduled",
    homeTeam: {
      "@type": "SportsTeam",
      name: homeTeam?.name || "Home",
      logo: homeTeam?.imageUrl || undefined,
    },
    awayTeam: {
      "@type": "SportsTeam",
      name: awayTeam?.name || "Away",
      logo: awayTeam?.imageUrl || undefined,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Matches", item: `${SITE_URL}/matches` },
      { "@type": "ListItem", position: 3, name: matchTitle, item: `${SITE_URL}/matches/${params.id}` },
    ],
  };

  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MatchCenterClient initialMatch={match} />
    </div>
  );
}
