import { NextRequest, NextResponse } from "next/server";
import { getTopClubs } from "@/lib/data/clubs";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * GET /api/clubs
 * Clubs ranked by squad value, as on the home page and /clubs.
 *
 * Query params:
 * - limit: number (1-200, default 24)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") || "24", 10);
  const limit = Number.isNaN(rawLimit) ? 24 : Math.min(Math.max(rawLimit, 1), 200);

  const clubs = await getTopClubs(limit).catch(() => []);

  return NextResponse.json(
    { success: true, data: clubs, meta: { limit, count: clubs.length } },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } }
  );
}
