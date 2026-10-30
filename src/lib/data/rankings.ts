import { supabase } from "@/lib/supabase";
import { sanitizeImageUrl } from "@/lib/image-sanitize";
import { getCanonicalPosition } from "@/lib/positions";
import { getPlayerSlug } from "@/lib/slugs";
import { calculateAge } from "@/lib/utils";
import { minBirthDateForMaxAge, type RankingDef } from "@/lib/rankings";

export interface RankedPlayer {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  position: string;
  age: number | null;
  nationality: string | null;
  marketValue: number;
  club: { id: string; name: string; logoUrl: string | null } | null;
}

/**
 * Top players for a ranking, by Player.latestMarketValue. Position groups are
 * derived with getCanonicalPosition (the stored strings vary by source), so
 * those rankings over-fetch and filter here. Returns [] on any error; the page
 * shows an honest empty state rather than sample data.
 */
export async function getRankedPlayers(def: RankingDef, limit = 50): Promise<RankedPlayer[]> {
  const { filter } = def;
  const clubJoin = filter.leagueId ? "Club!Player_currentClubId_fkey!inner" : "Club!Player_currentClubId_fkey";

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
        currentClub:${clubJoin} (
          id,
          name,
          logoUrl,
          leagueId
        )
      `)
      .not("currentClubId", "is", null)
      .not("latestMarketValue", "is", null)
      .is("deletedAt", null)
      .order("latestMarketValue", { ascending: false, nullsFirst: false })
      .limit(filter.positionGroup ? limit * 8 : limit);

    if (filter.nationality) builder = builder.contains("nationality", [filter.nationality]);
    if (filter.maxAge) builder = builder.gte("dateOfBirth", minBirthDateForMaxAge(filter.maxAge));
    if (filter.leagueId) builder = builder.eq("currentClub.leagueId", filter.leagueId);

    const { data, error } = await builder;
    if (error || !data) {
      console.error(`[Rankings] ${def.slug}:`, error);
      return [];
    }

    const rows = data.map((p: any): RankedPlayer & { group: string } => {
      const clubRaw = Array.isArray(p.currentClub) ? p.currentClub[0] : p.currentClub;
      const extId = p.transfermarktId || p.id;
      const canonical = getCanonicalPosition(p.subPosition || p.position);
      return {
        id: p.id,
        name: p.commonName || p.fullName,
        slug: getPlayerSlug(p),
        photoUrl: sanitizeImageUrl(p.photoUrl, "player", extId),
        position: canonical.detailed,
        group: canonical.group,
        age: calculateAge(p.dateOfBirth),
        nationality: Array.isArray(p.nationality) ? p.nationality[0] ?? null : p.nationality ?? null,
        marketValue: Number(p.latestMarketValue) || 0,
        club: clubRaw
          ? { id: clubRaw.id, name: clubRaw.name, logoUrl: sanitizeImageUrl(clubRaw.logoUrl, "club", clubRaw.id) }
          : null,
      };
    });

    return rows
      .filter((r) => r.marketValue > 0 && (!filter.positionGroup || r.group === filter.positionGroup))
      .slice(0, limit)
      .map(({ group: _group, ...r }) => r);
  } catch (err) {
    console.error(`[Rankings] ${def.slug}:`, err);
    return [];
  }
}
