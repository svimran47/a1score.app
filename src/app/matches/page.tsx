import { getMatchesByDate, TOP_LEAGUE_IDS } from "@/lib/fotmob/client";
import { MatchesClient } from "@/components/MatchesClient";
import { getDefaultMatchDate } from "@/lib/date-utils";
import { FOTMOB_TEAM_MAPPINGS } from "@/lib/league-mappings";
import { matchPassesFilter, matchesWithMappedClubs } from "@/lib/matches/following";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import type { Metadata } from "next";

export const revalidate = 30; // Dynamic edge revalidation for live match updates
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Live Football Matches — Scores, Lineups & Squad Values",
  description:
    "Live match scores, confirmed lineups, in-play timeline events, and squad market valuations across Europe's top leagues on a1score.",
  path: "/matches",
});

interface MatchesPageProps {
  searchParams: {
    date?: string;
    filter?: "all" | "live" | "finished" | "upcoming";
    scope?: "top" | "all";
  };
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const activeDate = getDefaultMatchDate(searchParams.date);
  const fetchedAt = new Date().toISOString();

  const activeFilter = searchParams.filter || "all";
  let activeScope: "top" | "all" = searchParams.scope === "all" ? "all" : "top";

  const data = await getMatchesByDate(activeDate);

  // Compute all matches across every competition for global status counts
  const allLeaguesMatches = data.leagues.flatMap((l) =>
    l.matches.map((match) => ({ ...match, _leagueId: l.id }))
  );
  const totalAllMatchesCount = allLeaguesMatches.length;

  // Filter leagues by scope (top 10 European competitions vs all)
  const topLeaguesMatches = data.leagues
    .filter((l) => TOP_LEAGUE_IDS.includes(l.id))
    .flatMap((l) => l.matches);
  const topMatchesCount = topLeaguesMatches.length;

  // Auto-switch to All Leagues if Top Leagues has 0 matches for the active date
  let autoSwitched = false;
  if (activeScope === "top" && topMatchesCount === 0 && totalAllMatchesCount > 0) {
    activeScope = "all";
    autoSwitched = true;
  }

  const scopedLeagues =
    activeScope === "all"
      ? data.leagues
      : data.leagues.filter((l) => TOP_LEAGUE_IDS.includes(l.id));

  // Global counts across the active scope
  const activeScopeMatches = scopedLeagues.flatMap((l) => l.matches);
  const totalScopedMatches = activeScopeMatches.length;
  const liveScopedMatchesCount = activeScopeMatches.filter((m) => m.isLive).length;
  const finishedScopedMatchesCount = activeScopeMatches.filter((m) => m.isFinished).length;
  const upcomingScopedMatchesCount = activeScopeMatches.filter((m) => m.isUpcoming).length;

  // Filter matches by status tab
  let leagues = scopedLeagues;
  if (activeFilter === "live") {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.isLive) }))
      .filter((l) => l.matches.length > 0);
  } else if (activeFilter === "finished") {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.isFinished) }))
      .filter((l) => l.matches.length > 0);
  } else if (activeFilter === "upcoming") {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.isUpcoming) }))
      .filter((l) => l.matches.length > 0);
  }

  // Every league (not just the current scope), so a followed team in a smaller
  // competition still shows; trimmed to matches with a mapped club.
  const followCandidates = matchesWithMappedClubs(data.leagues, FOTMOB_TEAM_MAPPINGS).filter((row) =>
    matchPassesFilter(row.match, activeFilter)
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Matches", item: `${SITE_URL}/matches` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MatchesClient
        followCandidates={followCandidates}
        activeDate={activeDate}
        activeFilter={activeFilter}
        activeScope={activeScope}
        autoSwitched={autoSwitched}
        leagues={leagues}
        totalScopedMatches={totalScopedMatches}
        liveScopedMatchesCount={liveScopedMatchesCount}
        finishedScopedMatchesCount={finishedScopedMatchesCount}
        upcomingScopedMatchesCount={upcomingScopedMatchesCount}
        totalAllMatchesCount={totalAllMatchesCount}
        fetchedAt={fetchedAt}
      />
    </>
  );
}
