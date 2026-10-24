import { NextRequest, NextResponse } from "next/server";
import { getMarketValueMovers } from "@/lib/data/players";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * GET /api/players/movers
 * Biggest market value risers and fallers since each player's previous valuation.
 *
 * Query params:
 * - limit: number (1-20, default 6) per list
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") || "6", 10);
  const limit = Number.isNaN(rawLimit) ? 6 : Math.min(Math.max(rawLimit, 1), 20);

  const { risers, fallers } = await getMarketValueMovers(limit);
  return NextResponse.json(
    { success: true, data: { risers, fallers } },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } }
  );
}
