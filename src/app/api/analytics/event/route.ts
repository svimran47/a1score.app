import { NextRequest, NextResponse } from "next/server";
import { sanitizeEventPayload } from "@/lib/analytics";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    if (!json || typeof json.event !== "string") {
      return new NextResponse(null, { status: 400 });
    }

    const sanitized = sanitizeEventPayload(json.event, json);
    if (!sanitized) {
      return new NextResponse(null, { status: 400 });
    }

    // Persist to analytics_events table asynchronously
    try {
      const { getSupabaseAdmin } = await import("@/lib/admin/supabase-admin");
      const supabaseAdmin = getSupabaseAdmin();
      void supabaseAdmin.from("analytics_events").insert({
        name: sanitized.event,
        payload: sanitized,
      });
    } catch {
      // ignore telemetry write failures
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Analytics Event] ${sanitized.event}`, sanitized.category || "");
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
