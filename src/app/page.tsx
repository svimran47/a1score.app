import Link from "next/link";
import { getMostValuablePlayers } from "@/lib/data/players";
import { getTopClubs } from "@/lib/data/clubs";
import { getMatchesByDate, TOP_LEAGUE_IDS } from "@/lib/fotmob/client";
import { supabase } from "@/lib/supabase";
import {
  Card,
  SectionHeader,
  MatchRow,
  PlayerRow,
  ClubRow,
  TransferRow,
} from "@/components/ui";
import { sanitizeImageUrl } from "@/lib/image-sanitize";
import { formatDate } from "@/lib/utils";
import { getPlayerSlug } from "@/lib/slugs";
import { SITE_URL } from "@/lib/siteUrl";
import type { FotmobMatch } from "@/lib/fotmob/client";
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";

export const revalidate = 300;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Live Football Scores, Player Market Values & Transfers",
  description:
    "Live football scores, fixtures and lineups with player market values, transfer news and club squad values for the Premier League, LaLiga, Serie A and more.",
  image: "/opengraph-image",
});

interface HomeTransferItem {
  id: string;
  playerName: string;
  playerSlug?: string | null;
  playerAvatar?: string | null;
  playerPosition?: string | null;
  fromClubName?: string | null;
  toClubName?: string | null;
  fee?: number | string | null;
  date?: string | null;
}

const HERO_LINKS = [
  { label: "Most valuable players", href: "/values" },
  { label: "Rankings", href: "/rankings" },
  { label: "Transfers", href: "/transfers" },
  { label: "Compare players", href: "/compare" },
];

function CardNotice({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">{children}</p>;
}

export default async function HomePage() {
  const [valuablePlayers, topClubs, matchesData, latestTransfersRes] = await Promise.all([
    getMostValuablePlayers(5).catch(() => []),
    getTopClubs(5).catch(() => []),
    getMatchesByDate().catch(() => null),
    supabase
      .from("Transfer")
      .select(`
        id,
        fromClubName,
        toClubName,
        date,
        feeEur,
        transferType,
        player:Player (
          id,
          fullName,
          commonName,
          photoUrl,
          position,
          transfermarktId
        )
      `)
      .order("date", { ascending: false, nullsFirst: false })
      .limit(5)
      .then(
        (res) => (res.error ? null : res.data || []),
        () => null
      ),
  ]);

  // Extract up to 3 highlighted matches (prioritizing top competitions: top leagues, UCL/UEL, internationals)
  const allMatches: FotmobMatch[] = (matchesData?.leagues || []).flatMap((l) => l.matches);

  // Sorting function: prefers top European leagues/cups, then kickoff timestamp
  const rankMatch = (m: FotmobMatch) => {
    const isTop = TOP_LEAGUE_IDS.includes(m.leagueId);
    return isTop ? 0 : 1;
  };

  const liveMatches = allMatches.filter((m) => m.isLive);
  liveMatches.sort((a, b) => rankMatch(a) - rankMatch(b));

  let matchSectionTitle = "Live now";
  let displayedMatches: FotmobMatch[] = [];

  if (liveMatches.length > 0) {
    matchSectionTitle = "Live now";
    displayedMatches = liveMatches.slice(0, 3);
  } else {
    matchSectionTitle = "Today's Matches";
    const upcomingMatches = allMatches.filter((m) => m.isUpcoming || !m.isFinished);
    upcomingMatches.sort((a, b) => {
      const rankDiff = rankMatch(a) - rankMatch(b);
      if (rankDiff !== 0) return rankDiff;
      return a.timeTS - b.timeTS;
    });
    displayedMatches = (upcomingMatches.length > 0 ? upcomingMatches : allMatches).slice(0, 3);
  }

  // Empty lists render an honest notice; never substitute sample data
  const transfers: HomeTransferItem[] =
    latestTransfersRes && latestTransfersRes.length > 0
      ? latestTransfersRes.map((t: any) => {
          const rawPlayer = t.player;
          const p = Array.isArray(rawPlayer) ? rawPlayer[0] : rawPlayer;
          return {
            id: t.id,
            playerName: p?.commonName || p?.fullName || "Player",
            playerSlug: p ? getPlayerSlug(p) : null,
            playerAvatar: p ? sanitizeImageUrl(p.photoUrl, "player", p.transfermarktId || p.id) : null,
            playerPosition: p?.position || null,
            fromClubName: t.fromClubName,
            toClubName: t.toClubName,
            fee: t.feeEur ? Number(t.feeEur) : t.transferType,
            date: t.date ? formatDate(t.date) : null,
          };
        })
      : [];

  const clubs = topClubs.slice(0, 5);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "a1score",
    alternateName: ["a1score.app", "A1 Score"],
    url: SITE_URL,
    description: "Football platform combining match fixtures and scores with player market valuation updates and club records.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: "a1score",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: "Football market intelligence and live match scores platform.",
    sameAs: ["https://github.com/svimran47/a1score.app"],
  };

  return (
    <div className="space-y-6 max-w-[720px] mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <section className="chrome rounded-[var(--card-radius)] px-4 py-4 sm:px-6 sm:py-7">
        <h1 className="text-xl sm:text-3xl font-bold leading-tight">
          Live scores, player market values and transfers
        </h1>
        <p className="hidden sm:block mt-2 text-base text-[var(--text-secondary)] max-w-[52ch]">
          Every match across Europe&apos;s top leagues, with what each player is worth right now.
        </p>
        <nav aria-label="Popular" className="mt-3 sm:mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap [scrollbar-width:none]">
          {HERO_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex shrink-0 min-h-[36px] items-center rounded-[var(--radius-pill)] bg-[var(--bg-chip)] px-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>
      {/* 1. COMPACT LIVE NOW STRIP (Match rows) */}
      <section>
        <SectionHeader
          title={matchSectionTitle}
          href="/matches"
          actionLabel="All matches"
        />
        <Card className="p-1 space-y-0.5">
          {displayedMatches.length > 0 ? (
            displayedMatches.map((match) => (
              <MatchRow
                key={match.id}
                id={match.id}
                homeName={match.home.name}
                homeCrest={match.home.imageUrl}
                awayName={match.away.name}
                awayCrest={match.away.imageUrl}
                homeScore={match.home.score}
                awayScore={match.away.score}
                isLive={match.isLive}
                liveMinute={match.status?.liveTime?.short || match.status?.reason?.short || "LIVE"}
                isFinished={match.isFinished}
                statusText={match.status?.scoreStr || (match.isFinished ? "FT" : undefined)}
                kickoffTime={match.time}
              />
            ))
          ) : (
            <CardNotice>No fixtures to show right now.</CardNotice>
          )}
        </Card>
      </section>

      {/* 2. MOST VALUABLE (Player rows, top 5, "See all" link) */}
      <section>
        <SectionHeader
          title="Most Valuable Players"
          href="/values"
          actionLabel="See all"
        />
        <Card className="p-1 space-y-0.5">
          {valuablePlayers.length === 0 && (
            <CardNotice>Market values couldn&apos;t be loaded. Try again in a moment.</CardNotice>
          )}
          {valuablePlayers.slice(0, 5).map((player, idx) => (
            <PlayerRow
              key={player.id}
              rank={idx + 1}
              id={player.id}
              name={player.fullName}
              slug={player.slug}
              avatarUrl={player.photoUrl}
              clubName={player.currentClub?.name}
              clubCrest={player.currentClub?.logoUrl}
              position={player.position}
              marketValue={player.latestMarketValue}
            />
          ))}
        </Card>
      </section>

      {/* 3. LATEST TRANSFERS (Transfer rows) */}
      <section>
        <SectionHeader
          title="Latest Transfers"
          href="/transfers"
          actionLabel="See all"
        />
        <Card className="p-1 space-y-0.5">
          {transfers.length === 0 && (
            <CardNotice>
              {latestTransfersRes
                ? "No transfers recorded yet."
                : "Transfers couldn't be loaded. Try again in a moment."}
            </CardNotice>
          )}
          {transfers.slice(0, 5).map((transfer) => (
            <TransferRow
              key={transfer.id}
              playerName={transfer.playerName}
              playerSlug={transfer.playerSlug}
              playerAvatar={transfer.playerAvatar}
              playerPosition={transfer.playerPosition}
              fromClubName={transfer.fromClubName}
              toClubName={transfer.toClubName}
              fee={transfer.fee}
              date={transfer.date}
            />
          ))}
        </Card>
      </section>

      {/* 4. TOP CLUBS BY SQUAD VALUE (Club rows) */}
      <section>
        <SectionHeader
          title="Top Clubs by Squad Value"
          href="/clubs"
          actionLabel="See all"
        />
        <Card className="p-1 space-y-0.5">
          {clubs.length === 0 && (
            <CardNotice>Squad values couldn&apos;t be loaded. Try again in a moment.</CardNotice>
          )}
          {clubs.map((club: any, idx: number) => (
            <ClubRow
              key={club.id}
              rank={idx + 1}
              id={club.id}
              name={club.name}
              crestUrl={club.logoUrl}
              leagueName={club.leagueName}
              country={club.country}
              squadSize={club.playerCount || club.squadSize}
              squadValue={club.totalSquadValue}
            />
          ))}
        </Card>
      </section>
    </div>
  );
}
