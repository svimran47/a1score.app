import { supabase } from "@/lib/supabase";
import {
  tmGetMostValuablePlayers,
  tmGetPlayer,
  tmSearchPlayers,
} from "@/lib/transfermarkt/client";
import { getFotmobPlayerStats } from "@/lib/fotmob/client";
import { sanitizeImageUrl } from "@/lib/image-sanitize";

import { getCanonicalPosition } from "@/lib/positions";
import { getPlayerSlug } from "@/lib/slugs";
import { feeStatusFromDb } from "@/lib/transfers";

export async function getMostValuablePlayers(limit = 40, positionFilter?: string) {
  // Fetch DB clubs to map TM club IDs to canonical DB club IDs
  let dbClubsMap = new Map<string, any>();
  try {
    const { data: dbClubs } = await supabase
      .from("Club")
      .select("id, name, transfermarktId, logoUrl, league:League ( id, name, country )");
    if (dbClubs) {
      dbClubs.forEach((c) => {
        if (c.transfermarktId) dbClubsMap.set(c.transfermarktId, c);
        dbClubsMap.set(c.name.toLowerCase(), c);
      });
    }
  } catch (e) {
    console.warn("Could not preload DB clubs for player mapping:", e);
  }

  // 1. First, attempt to fetch live worldwide rankings directly via Transfermarkt proxy
  try {
    const liveRanking = await tmGetMostValuablePlayers(limit, positionFilter);
    if (liveRanking && liveRanking.length > 0) {
      return liveRanking.slice(0, limit).map((p: any) => {
        const tmClubId = p.currentClub?.transfermarktId || p.currentClub?.id;
        const matchedClub =
          (tmClubId && dbClubsMap.get(tmClubId)) ||
          (p.currentClub?.name && dbClubsMap.get(p.currentClub.name.toLowerCase()));

        const canonicalClubId = matchedClub?.id || p.currentClub?.id || "unknown";
        const canonicalClubName = matchedClub?.name || p.currentClub?.name || "Unknown Club";
        const canonicalClubLogo = matchedClub?.logoUrl
          ? sanitizeImageUrl(matchedClub.logoUrl, "club", matchedClub.id)
          : p.currentClub?.logoUrl;

        const canonicalPos = getCanonicalPosition(p.position);
        const slug = getPlayerSlug({ fullName: p.fullName, transfermarktId: p.id });

        return {
          ...p,
          slug,
          position: canonicalPos.detailed,
          positionGroup: canonicalPos.group,
          canonicalPosition: canonicalPos,
          currentClub: p.currentClub
            ? {
                ...p.currentClub,
                id: canonicalClubId,
                name: canonicalClubName,
                logoUrl: canonicalClubLogo,
                league: matchedClub?.league || p.currentClub?.league || null,
              }
            : null,
        };
      });
    }
  } catch (proxyErr) {
    console.warn("[Data Layer] TM Live Proxy unavailable, falling back to DB:", proxyErr);
  }

  // 2. Fallback to Supabase Database (sorted by indexed latestMarketValue)
  try {
    let builder = supabase
      .from("Player")
      .select(`
        id,
        fullName,
        commonName,
        position,
        subPosition,
        photoUrl,
        transfermarktId,
        nationality,
        dateOfBirth,
        latestMarketValue,
        lastSeason,
        currentClub:Club!Player_currentClubId_fkey (
          id,
          name,
          logoUrl,
          league:League ( name )
        )
      `)
      .not("currentClubId", "is", null)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (positionFilter) {
      builder = builder.or(`position.ilike.%${positionFilter}%,subPosition.ilike.%${positionFilter}%`);
    }

    const { data: players, error } = await builder;

    if (error || !players) {
      console.error("Error fetching most valuable players from DB:", error);
      return [];
    }

    return players.map((p: any) => {
      const clubRaw = p.currentClub;
      const currentClub = Array.isArray(clubRaw) ? clubRaw[0] || null : clubRaw || null;
      const extId = p.transfermarktId || p.id;
      const canonicalPos = getCanonicalPosition(p.subPosition || p.position);
      return {
        ...p,
        sourceId: extId,
        slug: getPlayerSlug(p),
        photoUrl: sanitizeImageUrl(p.photoUrl, "player", extId),
        latestMarketValue: p.latestMarketValue ? Number(p.latestMarketValue) : 0,
        position: canonicalPos.detailed,
        positionGroup: canonicalPos.group,
        canonicalPosition: canonicalPos,
        currentClub: currentClub
          ? {
              ...currentClub,
              logoUrl: sanitizeImageUrl(currentClub.logoUrl, "club", currentClub.id),
            }
          : null,
      };
    });
  } catch (error) {
    console.error("Error fetching most valuable players:", error);
    return [];
  }
}

export interface GetPlayerOptions {
  /**
   * Enrich with FotMob season stats (and, on the DB path, a FotMob injury) when
   * the source has none. The player profile passes false and streams verified
   * season stats separately (src/lib/data/playerSeason.ts).
   */
  withFotmob?: boolean;
}

export async function getPlayerBySlugOrId(slugOrId: string, { withFotmob = true }: GetPlayerOptions = {}) {
  if (!slugOrId) return null;

  // 1. First, attempt to fetch live profile + valuation graph + transfers via TM proxy
  try {
    const livePlayer = await tmGetPlayer(slugOrId);
    if (livePlayer && livePlayer.fullName !== slugOrId && (livePlayer.latestMarketValue > 0 || (livePlayer.marketValues && livePlayer.marketValues.length > 0))) {
      // Ensure currentClub uses canonical DB CUID so links use canonical slug
      if (livePlayer.currentClub && livePlayer.currentClub.id) {
        try {
          const { data: dbClub } = await supabase
            .from("Club")
            .select("id, name, logoUrl, league:League ( id, name )")
            .or(`transfermarktId.eq.${livePlayer.currentClub.id},id.eq.${livePlayer.currentClub.id}`)
            .maybeSingle();

          if (dbClub) {
            livePlayer.currentClub.id = dbClub.id;
            livePlayer.currentClub.name = dbClub.name;
            if (dbClub.logoUrl) livePlayer.currentClub.logoUrl = dbClub.logoUrl;
            if (dbClub.league) livePlayer.currentClub.league = dbClub.league;
          }
        } catch {
          // ignore
        }
      }

      if (withFotmob && (!livePlayer.seasonStats || livePlayer.seasonStats.length === 0)) {
        try {
          const fotmobData = await getFotmobPlayerStats(livePlayer.commonName || livePlayer.fullName);
          if (fotmobData && fotmobData.seasonStats && fotmobData.seasonStats.length > 0) {
            livePlayer.seasonStats = fotmobData.seasonStats;
          }
        } catch {
          // ignore error
        }
      }
      return livePlayer;
    }
  } catch (proxyErr) {
    console.warn(`[Data Layer] TM Live Proxy failed for ${slugOrId}, falling back to DB:`, proxyErr);
  }

  // 2. Fallback to Supabase Database
  try {
    // Extract any trailing numeric ID from the slug (e.g. 'd-sir-dou--914562' -> '914562')
    const numericMatch = slugOrId.match(/\d+$/);
    const numericId = numericMatch ? numericMatch[0] : null;

    // Clean alphanumeric slug for sanitized searching
    const sanitizedId = slugOrId.replace(/[^a-zA-Z0-9_-]/g, "");

    let queryBuilder = supabase
      .from("Player")
      .select(`
        *,
        currentClub:Club!Player_currentClubId_fkey (
          *,
          league:League ( * )
        ),
        parentClub:Club!Player_parentClubId_fkey (
          *,
          league:League ( * )
        ),
        marketValues:MarketValueHistory (
          *
        ),
        seasonStats:SeasonStats (
          *
        ),
        transfers:Transfer (
          *
        ),
        injuries:Injury (
          *
        )
      `);

    // Match by numeric transfermarktId, internal ID, or exact transfermarktId
    if (numericId && numericId === sanitizedId) {
      queryBuilder = queryBuilder.or(`transfermarktId.eq.${numericId},id.eq.${sanitizedId}`);
    } else if (numericId) {
      queryBuilder = queryBuilder.or(`transfermarktId.eq.${numericId},id.eq.${sanitizedId}`);
    } else if (sanitizedId) {
      queryBuilder = queryBuilder.or(`id.eq.${sanitizedId},transfermarktId.eq.${sanitizedId}`);
    } else {
      return null;
    }

    let { data: player, error } = await queryBuilder.maybeSingle();

    // Secondary fallback: if ID lookup failed, search by name derived from slug
    if ((error || !player) && slugOrId.includes("-")) {
      const nameParts = slugOrId.replace(/-\d+$/, "").replace(/--+/g, "-").split("-").filter(Boolean);
      if (nameParts.length > 0) {
        const nameGuess = nameParts.join(" ");
        const playerSelectFields = `
          *,
          currentClub:Club!Player_currentClubId_fkey (
            *,
            league:League ( * )
          ),
          parentClub:Club!Player_parentClubId_fkey (
            *,
            league:League ( * )
          ),
          marketValues:MarketValueHistory (
            *
          ),
          seasonStats:SeasonStats (
            *
          ),
          transfers:Transfer (
            *
          ),
          injuries:Injury (
            *
          )
        `;

        // 1. Direct case-insensitive match
        const { data: nameMatch } = await supabase
          .from("Player")
          .select(playerSelectFields)
          .ilike("fullName", `%${nameGuess}%`)
          .order("latestMarketValue", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (nameMatch) {
          player = nameMatch;
        } else {
          // 2. Flexible token/accent matching:
          // Replace vowels with single-character wildcard '_' to bridge accented characters
          // (e.g. 'mbappe' -> 'mb_pp_', which matches 'Mbappé', or 'kylian' & 'mbappe' -> '%kylian%mbapp%')
          const wildcardTokens = nameParts.map((p) => p.replace(/[aeiouy]/gi, "_"));
          const joinedPattern = wildcardTokens.join("%");

          let { data: accentMatch } = await supabase
            .from("Player")
            .select(playerSelectFields)
            .ilike("fullName", `%${joinedPattern}%`)
            .order("latestMarketValue", { ascending: false })
            .limit(1)
            .maybeSingle();

          // No single-surname fallback: matching one 4+ char token (e.g. "exist")
          // returns an unrelated player for unknown slugs, so unmatched slugs stay null.
          if (accentMatch) {
            player = accentMatch;
          }
        }
      }
    }

    if (!player) {
      return null;
    }

    // Sort market values chronologically (asc) for charts, filtering out invalid dates
    const sortedMarketValues = (player.marketValues || [])
      .filter((mv: any) => mv && mv.date && !isNaN(new Date(mv.date).getTime()))
      .map((mv: any) => ({
        ...mv,
        valueEur: Number(mv.valueEur) || 0,
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // latestMarketValue may come from another source and time than the history;
    // it is returned as-is and never appended as a point dated today.

    // Sort transfers chronologically (desc), safely handling null/invalid dates
    const sortedTransfers = (player.transfers || [])
      .map((t: any) => ({
        ...t,
        feeEur: t.feeEur ? Number(t.feeEur) : null,
        feeStatus: feeStatusFromDb(t.feeEur),
      }))
      .sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

    // Sort stats by season (desc)
    let sortedSeasonStats = (player.seasonStats || []).sort(
      (a: any, b: any) => b.season?.localeCompare?.(a.season ?? "") ?? 0
    );

    // If seasonStats is empty, enrich with authentic FotMob tournament statistics
    let injuries = player.injuries || [];
    if (withFotmob && sortedSeasonStats.length === 0) {
      try {
        const fotmobData = await getFotmobPlayerStats(player.commonName || player.fullName);
        if (fotmobData && fotmobData.seasonStats && fotmobData.seasonStats.length > 0) {
          sortedSeasonStats = fotmobData.seasonStats;
        }
        if (fotmobData && fotmobData.injury && injuries.length === 0) {
          injuries = [
            {
              id: `fotmob-inj-${fotmobData.id}`,
              type: fotmobData.injury.injuryType || "Injury",
              startDate: fotmobData.injury.startDate || new Date().toISOString(),
              endDate: fotmobData.injury.expectedReturn || null,
              status: "active",
            },
          ];
        }
      } catch (err) {
        console.warn(`[Data Layer] FotMob enrichment failed for ${player.fullName}:`, err);
      }
    }

    const extId = player.transfermarktId || player.id;
    const clubRaw = player.currentClub;
    const currentClub = Array.isArray(clubRaw) ? clubRaw[0] || null : clubRaw || null;
    const safeDob = player.dateOfBirth && !isNaN(new Date(player.dateOfBirth).getTime()) ? player.dateOfBirth : null;

    return {
      ...player,
      sourceId: extId,
      fullName: player.fullName || "Player Profile",
      commonName: player.commonName || player.fullName || "Player Profile",
      dateOfBirth: safeDob,
      nationality: Array.isArray(player.nationality)
        ? player.nationality
        : typeof player.nationality === "string" && player.nationality
        ? [player.nationality]
        : [],
      position: player.position || "Unknown",
      subPosition: player.subPosition || null,
      preferredFoot: player.preferredFoot || null,
      heightCm: player.heightCm ? Number(player.heightCm) : null,
      slug: getPlayerSlug(player),
      photoUrl: sanitizeImageUrl(player.photoUrl, "player", extId),
      currentClub: currentClub
        ? {
            ...currentClub,
            logoUrl: sanitizeImageUrl(currentClub.logoUrl, "club", currentClub.id),
          }
        : null,
      latestMarketValue: player.latestMarketValue
        ? Number(player.latestMarketValue)
        : sortedMarketValues[sortedMarketValues.length - 1]?.valueEur || 0,
      marketValues: sortedMarketValues,
      transfers: sortedTransfers,
      seasonStats: sortedSeasonStats,
      injuries,
    };
  } catch (error) {
    console.error(`Error fetching player ${slugOrId} from DB:`, error);
    return null;
  }
}

export interface DbPlayerIdentity {
  id: string;
  status: string | null;
  lastSeason: number | null;
  parentClub: { id: string; name: string; logoUrl: string | null } | null;
  injuries: Array<{
    id: string;
    type: string;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
  }>;
  /** DB SeasonStats rows, so the profile can prefer them over FotMob on the TM path. */
  seasonStats: any[];
}

/**
 * DB-only facts for a player loaded from the Transfermarkt proxy: the cuid
 * (achievements, follow key), status, loan parent club, injuries and stats.
 * Null when the player is not in the database or the lookup fails.
 */
export async function getDbPlayerByTransfermarktId(tmId: string | number | null | undefined): Promise<DbPlayerIdentity | null> {
  const id = String(tmId ?? "").trim();
  if (!/^\d+$/.test(id)) return null;
  try {
    const { data, error } = await supabase
      .from("Player")
      .select(`
        id,
        status,
        lastSeason,
        parentClub:Club!Player_parentClubId_fkey ( id, name, logoUrl ),
        injuries:Injury ( id, type, startDate, endDate, status ),
        seasonStats:SeasonStats ( * )
      `)
      .eq("transfermarktId", id)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as any;
    const parentRaw = Array.isArray(row.parentClub) ? row.parentClub[0] ?? null : row.parentClub ?? null;
    return {
      id: String(row.id),
      status: row.status ?? null,
      lastSeason: row.lastSeason != null ? Number(row.lastSeason) : null,
      parentClub: parentRaw && parentRaw.id && parentRaw.name
        ? { id: String(parentRaw.id), name: String(parentRaw.name), logoUrl: parentRaw.logoUrl ?? null }
        : null,
      injuries: Array.isArray(row.injuries) ? row.injuries : [],
      seasonStats: Array.isArray(row.seasonStats) ? row.seasonStats : [],
    };
  } catch (err) {
    console.warn(`[Data Layer] DB identity lookup failed for TM id ${id}:`, err);
    return null;
  }
}

export async function searchPlayers(
  query: string,
  options: { position?: string; clubId?: string; limit?: number } = {}
) {
  const { position, clubId, limit = 20 } = options;

  // 1. Live search via Transfermarkt proxy when searching by name
  if (query && !clubId) {
    try {
      const liveResults = await tmSearchPlayers(query, { position, limit });
      if (liveResults && liveResults.length > 0) {
        return liveResults;
      }
    } catch (proxyErr) {
      console.warn("[Data Layer] TM Live Search failed, falling back to DB:", proxyErr);
    }
  }

  // 2. Fallback to Supabase Database
  try {
    let builder = supabase
      .from("Player")
      .select(`
        id,
        fullName,
        commonName,
        position,
        subPosition,
        photoUrl,
        transfermarktId,
        latestMarketValue,
        currentClub:Club!Player_currentClubId_fkey (
          id,
          name,
          logoUrl,
          league:League ( id, name )
        )
      `)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (query) {
      builder = builder.or(`fullName.ilike.%${query}%,commonName.ilike.%${query}%`);
    }

    if (position) {
      builder = builder.ilike("position", position);
    }

    if (clubId) {
      builder = builder.eq("currentClubId", clubId);
    }

    const { data: players, error } = await builder;

    if (error || !players) {
      console.error("Error searching players in DB:", error);
      return [];
    }

    return players.map((p: any) => {
      const clubRaw = p.currentClub;
      const currentClub = Array.isArray(clubRaw) ? clubRaw[0] || null : clubRaw || null;
      const extId = p.transfermarktId || p.id;
      return {
        ...p,
        sourceId: extId,
        slug: getPlayerSlug(p),
        photoUrl: sanitizeImageUrl(p.photoUrl, "player", extId),
        latestMarketValue: p.latestMarketValue ? Number(p.latestMarketValue) : 0,
        currentClub: currentClub
          ? {
              ...currentClub,
              logoUrl: sanitizeImageUrl(currentClub.logoUrl, "club", currentClub.id),
            }
          : null,
      };
    });
  } catch (error) {
    console.error("Error searching players:", error);
    return [];
  }
}

export interface MarketMover {
  id: string;
  fullName: string;
  commonName?: string | null;
  slug: string;
  position: string;
  photoUrl?: string | null;
  currentClub?: {
    id?: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  latestValue: number;
  prevValue: number;
  diff: number;
  percentage: number;
  lastUpdated?: string;
}

/**
 * Computes authentic market value risers and fallers based on chronological valuation records
 */
export async function getMarketValueMovers(limit = 6): Promise<{ risers: MarketMover[]; fallers: MarketMover[] }> {
  try {
    const { data: players, error } = await supabase
      .from("Player")
      .select(`
        id,
        fullName,
        commonName,
        position,
        photoUrl,
        transfermarktId,
        latestMarketValue,
        currentClub:Club!Player_currentClubId_fkey (
          id,
          name,
          logoUrl
        ),
        marketValues:MarketValueHistory (
          date,
          valueEur
        )
      `)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(300);

    if (error || !players) {
      console.error("Error fetching market value movers:", error);
      return { risers: [], fallers: [] };
    }

    const calculatedMovers: MarketMover[] = [];

    for (const p of players) {
      const mvs = (p.marketValues || []).sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (mvs.length >= 2) {
        const latestPoint = mvs[mvs.length - 1];
        const prevPoint = mvs[mvs.length - 2];
        const latestVal = Number(latestPoint.valueEur);
        const prevVal = Number(prevPoint.valueEur);
        const diff = latestVal - prevVal;
        const percentage = prevVal > 0 ? (diff / prevVal) * 100 : 0;

        const slug = getPlayerSlug(p);

        const clubRaw = (p as any).currentClub;
        const currentClub = Array.isArray(clubRaw) ? clubRaw[0] || null : clubRaw || null;

        calculatedMovers.push({
          id: p.id,
          fullName: p.fullName,
          commonName: p.commonName,
          slug,
          position: p.position,
          photoUrl: sanitizeImageUrl(p.photoUrl, "player", p.transfermarktId || p.id),
          currentClub: currentClub
            ? {
                ...currentClub,
                logoUrl: sanitizeImageUrl(currentClub.logoUrl, "club", currentClub.id),
              }
            : null,
          latestValue: latestVal,
          prevValue: prevVal,
          diff,
          percentage,
          lastUpdated: latestPoint.date,
        });
      }
    }

    const risers = calculatedMovers
      .filter((m) => m.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, limit);

    const fallers = calculatedMovers
      .filter((m) => m.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, limit);

    return { risers, fallers };
  } catch (err) {
    console.error("Failed to compute market value movers:", err);
    return { risers: [], fallers: [] };
  }
}

export interface PositionalPeer {
  id: string;
  fullName: string;
  commonName?: string | null;
  slug: string;
  position: string;
  subPosition?: string | null;
  dateOfBirth?: string | Date | null;
  photoUrl?: string | null;
  latestMarketValue: number;
  currentClub?: {
    name: string;
    logoUrl?: string | null;
  } | null;
  rank: number;
}

/**
 * Retrieves top worldwide peers playing in the same primary position
 */
export async function getPositionalPeers(
  position: string,
  excludePlayerId: string,
  limit = 5
): Promise<PositionalPeer[]> {
  if (!position) return [];

  try {
    // Use the specific position term first for precision (e.g. "Centre-Forward"),
    // only falling back to broader group if too few results
    let primaryPos = String(position);
    const broadGroup = primaryPos.includes("Midfield") ? "Midfield"
      : (primaryPos.includes("Forward") || primaryPos.includes("Striker")) ? "Forward"
      : primaryPos.includes("Winger") ? "Winger"
      : (primaryPos.includes("Back") || primaryPos.includes("Defender")) ? "Defender"
      : primaryPos.includes("Goalkeeper") ? "Goalkeeper"
      : primaryPos;

    // Try specific subPosition or position first (e.g. "Centre-Forward")
    const { data: specificPeers, error: specificError } = await supabase
      .from("Player")
      .select(`
        id,
        fullName,
        commonName,
        position,
        subPosition,
        photoUrl,
        transfermarktId,
        dateOfBirth,
        latestMarketValue,
        currentClub:Club!Player_currentClubId_fkey (
          name,
          logoUrl
        )
      `)
      .or(`subPosition.ilike.%${primaryPos}%,position.ilike.%${primaryPos}%`)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(limit + 5);

    let peers = specificPeers || [];

    // If too few specific results, fall back to broader group
    if (peers.length < limit + 1 && broadGroup !== primaryPos) {
      const { data: broadPeers } = await supabase
        .from("Player")
        .select(`
          id,
          fullName,
          commonName,
          position,
          subPosition,
          photoUrl,
          transfermarktId,
          dateOfBirth,
          latestMarketValue,
          currentClub:Club!Player_currentClubId_fkey (
            name,
            logoUrl
          )
        `)
        .or(`position.ilike.%${broadGroup}%,subPosition.ilike.%${broadGroup}%`)
        .order("latestMarketValue", { ascending: false, nullsFirst: false })
        .limit(limit + 5);

      if (broadPeers && broadPeers.length > peers.length) {
        peers = broadPeers;
      }
    }

    if (!peers || peers.length === 0) {
      console.warn("Error fetching positional peers:", specificError?.message || specificError);
      return [];
    }

    const filtered = peers
      .filter((p: any) => p.id !== excludePlayerId && p.transfermarktId !== excludePlayerId)
      .slice(0, limit);

    return filtered.map((p: any, idx: number) => {
      const clubRaw = p.currentClub;
      const currentClub = Array.isArray(clubRaw) ? clubRaw[0] || null : clubRaw || null;

      return {
        id: p.id,
        fullName: p.fullName,
        commonName: p.commonName,
        slug: getPlayerSlug(p),
        position: p.position,
        subPosition: p.subPosition,
        dateOfBirth: p.dateOfBirth,
        photoUrl: sanitizeImageUrl(p.photoUrl, "player", p.transfermarktId || p.id),
        latestMarketValue: p.latestMarketValue ? Number(p.latestMarketValue) : 0,
        currentClub: currentClub
          ? {
              ...currentClub,
              logoUrl: sanitizeImageUrl(currentClub.logoUrl, "club"),
            }
          : null,
        rank: idx + 1,
      };
    });
  } catch (err) {
    console.error("Failed to fetch positional peers:", err);
    return [];
  }
}
