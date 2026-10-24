import { NextRequest, NextResponse } from "next/server";
import { getTransfersHubData } from "@/lib/data/transfers";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * GET /api/transfers
 * Latest transfers, as on the home page and the Transfer Centre.
 *
 * Query params:
 * - limit: number (1-100, default 20)
 * - type: "moves" (default, fee/loan/free moves) | "ends" (contract ends, releases, retirements) | "records" (all-time record fees)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
  const type = searchParams.get("type") || "moves";

  try {
    const hub = await getTransfersHubData();
    const rows =
      type === "ends" ? hub.contractEndsAndRetirements : type === "records" ? hub.allTimeRecords : hub.recentCommercial;
    const data = rows.slice(0, limit);
    return NextResponse.json(
      { success: true, data, meta: { limit, type, count: data.length } },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } }
    );
  } catch (err: any) {
    console.error("Error in /api/transfers:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch transfers" }, { status: 500 });
  }
}
