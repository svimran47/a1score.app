import { NextRequest, NextResponse } from "next/server";
import { getLeagueById } from "@/lib/data/leagues";
import { FOTMOB_LEAGUE_MAP, getLeagueStandings, pureMd5 } from "@/lib/fotmob/client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/leagues/[id]
 * Same data as the /leagues/[id] page: standings with squad values, clubs, leaders.
 * Accepts a league CUID, slug, Transfermarkt code (GB1) or FotMob id (47, as used by /api/matches).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const raw = params.id;
    const tmCode = /^\d+$/.test(raw)
      ? Object.keys(FOTMOB_LEAGUE_MAP).find((k) => FOTMOB_LEAGUE_MAP[k] === Number(raw))
      : undefined;

    let data: any = await getLeagueById(tmCode || raw);

    // FotMob leagues we don't hold in Supabase still get a table, without squad values
    if (!data && /^\d+$/.test(raw)) {
      const fm = await getLeagueStandings(Number(raw));
      if (fm) data = { id: raw, standings: fm.standings, legend: fm.legend || [], clubs: [], season: fm.season };
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "League not found" }, { status: 404 });
    }

    const { otherLeagues, ...league } = data;
    const payloadStr = JSON.stringify({ success: true, data: league });
    const etag = `"${pureMd5(payloadStr)}"`;
    const headers = {
      ETag: etag,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    };

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    return new NextResponse(payloadStr, {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Error in /api/leagues/${params.id}:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch league" },
      { status: 500 }
    );
  }
}
