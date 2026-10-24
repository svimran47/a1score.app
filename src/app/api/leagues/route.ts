import { NextRequest, NextResponse } from "next/server";
import { getLeagues } from "@/lib/data/leagues";
import { getMatchesByDate } from "@/lib/fotmob/client";
import { sanitizeImageUrl } from "@/lib/image-sanitize";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function yyyymmdd(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * GET /api/leagues
 * Leagues we hold squad values for, ranked by total market value.
 *
 * Query params:
 * - scope=all: also returns `competitions`, every competition with fixtures from
 *   3 days ago to 7 days ahead (same feed as /api/matches), so apps can list and
 *   open leagues beyond the valued ones. Their ids work with /api/leagues/[id].
 */
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope");
  const leagues = await getLeagues();
  if (scope !== "all") {
    return NextResponse.json({ success: true, data: leagues });
  }

  const days = await Promise.all(
    Array.from({ length: 11 }, (_, i) => getMatchesByDate(yyyymmdd(i - 3)).catch(() => null))
  );
  const byId = new Map<string, { id: string; name: string; ccode: string; logoUrl: string | null; matches: number }>();
  for (const day of days) {
    for (const l of day?.leagues || []) {
      const id = String(l.primaryId || l.id);
      if (!id || id === "undefined") continue;
      const row = byId.get(id);
      if (row) {
        row.matches += l.matches.length;
      } else {
        byId.set(id, {
          id,
          name: l.name,
          ccode: l.ccode,
          logoUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png`),
          matches: l.matches.length,
        });
      }
    }
  }
  const competitions = Array.from(byId.values()).sort(
    (a, b) => a.ccode.localeCompare(b.ccode) || a.name.localeCompare(b.name)
  );

  return NextResponse.json(
    { success: true, data: leagues, competitions },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
