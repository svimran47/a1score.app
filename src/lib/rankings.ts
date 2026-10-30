/**
 * src/lib/rankings.ts
 *
 * Ranking landing pages ("most valuable Brazilian players", "most valuable
 * Premier League players", ...). Each definition is one indexable page under
 * /rankings/[slug] that answers a common search with a list ranked by
 * market value. Pure data, no I/O, so the sitemap and tests can import it.
 */

import type { PositionGroup } from "@/lib/positions";

export type RankingKind = "position" | "age" | "nation" | "league";

export interface RankingFilter {
  positionGroup?: PositionGroup;
  /** Born after (today minus maxAge years): players aged maxAge-1 or younger. */
  maxAge?: number;
  /** Transfermarkt nationality spelling as stored in Player.nationality. */
  nationality?: string;
  leagueId?: string;
}

export interface RankingDef {
  slug: string;
  kind: RankingKind;
  /** H1 and list name, e.g. "Most valuable Brazilian players". */
  heading: string;
  /** Short label for hub chips and related links. */
  label: string;
  /** One or two sentences of unique intro copy shown above the list. */
  intro: string;
  filter: RankingFilter;
}

const POSITIONS: { group: PositionGroup; word: string; slug: string }[] = [
  { group: "ATT", word: "forwards", slug: "forwards" },
  { group: "MID", word: "midfielders", slug: "midfielders" },
  { group: "DEF", word: "defenders", slug: "defenders" },
  { group: "GK", word: "goalkeepers", slug: "goalkeepers" },
];

const AGES = [
  { maxAge: 21, label: "Under 21", slug: "under-21" },
  { maxAge: 23, label: "Under 23", slug: "under-23" },
];

// [stored nationality, demonym, slug]
const NATIONS: [string, string, string][] = [
  ["England", "English", "english"],
  ["France", "French", "french"],
  ["Brazil", "Brazilian", "brazilian"],
  ["Spain", "Spanish", "spanish"],
  ["Germany", "German", "german"],
  ["Argentina", "Argentine", "argentine"],
  ["Portugal", "Portuguese", "portuguese"],
  ["Netherlands", "Dutch", "dutch"],
  ["Italy", "Italian", "italian"],
  ["Belgium", "Belgian", "belgian"],
  ["Norway", "Norwegian", "norwegian"],
  ["Uruguay", "Uruguayan", "uruguayan"],
  ["Croatia", "Croatian", "croatian"],
  ["Morocco", "Moroccan", "moroccan"],
  ["Nigeria", "Nigerian", "nigerian"],
  ["Japan", "Japanese", "japanese"],
  ["United States", "American", "american"],
  ["Colombia", "Colombian", "colombian"],
];

// Same ids as the sitemap and footer
export const RANKING_LEAGUES: { id: string; name: string; slug: string }[] = [
  { id: "cmuihndux0003b23fizizm4a0", name: "Premier League", slug: "premier-league" },
  { id: "cmuihncv70001b23frvqgzdp6", name: "LaLiga", slug: "laliga" },
  { id: "cmuihnegb0004b23fhslrse6b", name: "Serie A", slug: "serie-a" },
  { id: "cmuihneym0005b23fkpqbo0uj", name: "Bundesliga", slug: "bundesliga" },
  { id: "cmuihnddf0002b23fskdzdx29", name: "Ligue 1", slug: "ligue-1" },
  { id: "cmuihnfy10007b23f3j6km8jo", name: "Liga Portugal", slug: "liga-portugal" },
  { id: "cmuihnffm0006b23feq78bq1b", name: "Eredivisie", slug: "eredivisie" },
];

export const RANKINGS: RankingDef[] = [
  ...POSITIONS.map((p): RankingDef => ({
    slug: `most-valuable-${p.slug}`,
    kind: "position",
    heading: `Most valuable ${p.word} in the world`,
    label: p.word[0].toUpperCase() + p.word.slice(1),
    intro: `The ${p.word} with the highest market value right now, ranked across every league a1score tracks. Values update as Transfermarkt revises them.`,
    filter: { positionGroup: p.group },
  })),
  ...AGES.map((a): RankingDef => ({
    slug: `most-valuable-${a.slug}-players`,
    kind: "age",
    heading: `Most valuable ${a.label} players`,
    label: a.label,
    intro: `The most valuable footballers aged ${a.maxAge - 1} or younger, the wonderkids whose market value is still climbing.`,
    filter: { maxAge: a.maxAge },
  })),
  ...NATIONS.map(([nationality, demonym, slug]): RankingDef => ({
    slug: `most-valuable-${slug}-players`,
    kind: "nation",
    heading: `Most valuable ${demonym} players`,
    label: demonym,
    intro: `${demonym} footballers ranked by current market value, wherever they play their club football.`,
    filter: { nationality },
  })),
  ...RANKING_LEAGUES.map((l): RankingDef => ({
    slug: `most-valuable-${l.slug}-players`,
    kind: "league",
    heading: `Most valuable ${l.name} players`,
    label: l.name,
    intro: `Every ${l.name} squad member ranked by market value, from the league's biggest stars down.`,
    filter: { leagueId: l.id },
  })),
];

export const RANKING_KIND_LABELS: Record<RankingKind, string> = {
  position: "By position",
  age: "By age",
  nation: "By nationality",
  league: "By league",
};

export function getRanking(slug: string): RankingDef | undefined {
  return RANKINGS.find((r) => r.slug === slug);
}

/** Up to `limit` other rankings, same kind first, for internal links. */
export function getRelatedRankings(slug: string, limit = 6): RankingDef[] {
  const current = getRanking(slug);
  if (!current) return RANKINGS.slice(0, limit);
  const others = RANKINGS.filter((r) => r.slug !== slug);
  const sameKind = others.filter((r) => r.kind === current.kind);
  const rest = others.filter((r) => r.kind !== current.kind);
  return [...sameKind, ...rest].slice(0, limit);
}

/** ISO date (YYYY-MM-DD) of the earliest birth date for a max-age filter. */
export function minBirthDateForMaxAge(maxAge: number, today: Date = new Date()): string {
  const d = new Date(Date.UTC(today.getUTCFullYear() - maxAge, today.getUTCMonth(), today.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Rankings a player belongs to, for internal links from the player profile:
 * league, position group, age band and nationality, in that order.
 */
export function getRankingsForPlayer(p: {
  positionGroup?: PositionGroup | null;
  age?: number | null;
  nationality?: string | null;
  leagueName?: string | null;
}): RankingDef[] {
  const out: RankingDef[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  if (p.leagueName) {
    const league = RANKING_LEAGUES.find((l) => norm(l.name) === norm(p.leagueName!));
    const def = league && RANKINGS.find((r) => r.filter.leagueId === league.id);
    if (def) out.push(def);
  }
  if (p.positionGroup) {
    const def = RANKINGS.find((r) => r.filter.positionGroup === p.positionGroup);
    if (def) out.push(def);
  }
  if (typeof p.age === "number") {
    const def = RANKINGS.filter((r) => r.filter.maxAge && p.age! < r.filter.maxAge).sort(
      (a, b) => a.filter.maxAge! - b.filter.maxAge!
    )[0];
    if (def) out.push(def);
  }
  if (p.nationality) {
    const def = RANKINGS.find((r) => r.filter.nationality && norm(r.filter.nationality) === norm(p.nationality!));
    if (def) out.push(def);
  }
  return out;
}
