import { MetadataRoute } from "next";
import { getAllClubs } from "@/lib/data/clubs";
import { supabase } from "@/lib/supabase";
import { getEffectiveSiteUrl } from "@/lib/metadata";
import { getClubSlug, getLeagueSlug, getPlayerSlug } from "@/lib/slugs";
import { getMatchesByDate } from "@/lib/fotmob/client";
import { RANKINGS } from "@/lib/rankings";

export const runtime = "edge";
export const revalidate = 86400; // Cache sitemap for 24 hours

const TRACKED_LEAGUES = [
  { name: "Premier League", id: "cmuihndux0003b23fizizm4a0" },
  { name: "LaLiga", id: "cmuihncv70001b23frvqgzdp6" },
  { name: "Serie A", id: "cmuihnegb0004b23fhslrse6b" },
  { name: "Bundesliga", id: "cmuihneym0005b23fkpqbo0uj" },
  { name: "Ligue 1", id: "cmuihnddf0002b23fskdzdx29" },
  { name: "Liga Portugal", id: "cmuihnfy10007b23f3j6km8jo" },
  { name: "Eredivisie", id: "cmuihnffm0006b23feq78bq1b" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getEffectiveSiteUrl();
  const now = new Date();

  // Helper: safely format entity date without exceeding current time
  const getSafeDate = (d: string | Date | null | undefined): Date | undefined => {
    if (!d) return undefined;
    const parsed = typeof d === "string" ? new Date(d) : d;
    if (isNaN(parsed.getTime())) return undefined;
    return parsed > now ? now : parsed;
  };

  // 1. Static Core Pages:
  // Pages without a real entity update date omit lastModified.
  // Realtime/daily pages reflect actual system context.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/matches`,
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/values`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/players`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/clubs`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leagues`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/transfers`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rankings`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/lineup-builder`,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/predict`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // 2. League Competitions (Readable Slugs)
  const leagueRoutes: MetadataRoute.Sitemap = TRACKED_LEAGUES.map((l) => ({
    url: `${baseUrl}/leagues/${getLeagueSlug(l)}`,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  // 2b. Ranking landing pages ("most valuable X players")
  const rankingRoutes: MetadataRoute.Sitemap = RANKINGS.map((r) => ({
    url: `${baseUrl}/rankings/${r.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // 3. Dynamic All Public Clubs (Readable Slugs with authentic lastSyncedAt/updatedAt)
  let clubRoutes: MetadataRoute.Sitemap = [];
  try {
    const clubs = await getAllClubs({ all: true });
    if (clubs && clubs.length > 0) {
      clubRoutes = clubs.map((c: any) => {
        const lastMod = getSafeDate(c.lastSyncedAt || c.updatedAt);
        return {
          url: `${baseUrl}/clubs/${getClubSlug(c)}`,
          ...(lastMod ? { lastModified: lastMod } : {}),
          changeFrequency: "weekly",
          priority: 0.75,
        };
      });
    }
  } catch (err) {
    console.warn("[Sitemap] Failed to fetch clubs for sitemap:", err);
  }

  // 4. Dynamic Public Players (Readable Slugs with authentic updatedAt)
  let playerRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: dbPlayers } = await supabase
      .from("Player")
      .select("id, fullName, transfermarktId, updatedAt")
      .not("latestMarketValue", "is", null)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(10000);

    if (dbPlayers && dbPlayers.length > 0) {
      playerRoutes = dbPlayers.map((p: any) => {
        const slug = getPlayerSlug(p);
        const lastMod = getSafeDate(p.updatedAt);
        return {
          url: `${baseUrl}/players/${slug}`,
          ...(lastMod ? { lastModified: lastMod } : {}),
          changeFrequency: "weekly",
          priority: 0.7,
        };
      });
    }
  } catch (err) {
    console.warn("[Sitemap] Failed to fetch players for sitemap:", err);
  }

  // 5. Finished Matches (only include verified finished fixtures with verified match time)
  let matchRoutes: MetadataRoute.Sitemap = [];
  try {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const res = await getMatchesByDate(yesterday).catch(() => null);
    if (res && Array.isArray(res.leagues)) {
      const finished = res.leagues
        .flatMap((l) => l.matches || [])
        .filter((m) => m && m.id && m.isFinished);

      matchRoutes = finished.slice(0, 100).map((m) => {
        const matchTime = getSafeDate(m.status?.utcTime || m.time);
        return {
          url: `${baseUrl}/matches/${m.id}`,
          ...(matchTime ? { lastModified: matchTime } : {}),
          changeFrequency: "monthly",
          priority: 0.6,
        };
      });
    }
  } catch (err) {
    console.warn("[Sitemap] Failed to fetch finished matches for sitemap:", err);
  }

  return [...staticRoutes, ...leagueRoutes, ...rankingRoutes, ...clubRoutes, ...playerRoutes, ...matchRoutes];
}
