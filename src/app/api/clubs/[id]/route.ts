import { NextRequest, NextResponse } from "next/server";
import { getClubById, getClubTransfers, getClubSnapshots } from "@/lib/data/clubs";
import { getClubHonours } from "@/lib/data/honours";
import { getFotmobTeamDetails } from "@/lib/fotmob/client";
import { FOTMOB_TEAM_MAPPINGS } from "@/lib/league-mappings";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * GET /api/clubs/[id]
 * Club with its valued squad.
 *
 * Query params:
 * - include=details: also returns what the /clubs/[id] page shows: `transfers`
 *   (record arrivals/departures), `team` (venue, manager, recent form, next match,
 *   league position), `honours` and `snapshots` (squad value history).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const club = await getClubById(params.id);
  if (!club) {
    return NextResponse.json({ success: false, error: "Club not found" }, { status: 404 });
  }
  if (new URL(req.url).searchParams.get("include") !== "details") {
    return NextResponse.json({ success: true, data: club });
  }

  let fotmobTeamId: number | null = null;
  for (const [fId, mapping] of Object.entries(FOTMOB_TEAM_MAPPINGS)) {
    if (mapping.tmId === club.transfermarktId || mapping.name?.toLowerCase() === club.name?.toLowerCase()) {
      fotmobTeamId = Number(fId);
      break;
    }
  }

  const [transfers, team, honours, snapshots] = await Promise.all([
    getClubTransfers(club.name).catch(() => ({ recordArrivals: [], recordDepartures: [] })),
    fotmobTeamId ? getFotmobTeamDetails(fotmobTeamId).catch(() => null) : Promise.resolve(null),
    getClubHonours(club.id).catch(() => []),
    getClubSnapshots(club.id).catch(() => []),
  ]);

  return NextResponse.json(
    { success: true, data: { ...club, fotmobTeamId, transfers, team, honours, snapshots } },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }
  );
}
