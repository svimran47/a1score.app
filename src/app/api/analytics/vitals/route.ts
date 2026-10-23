import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    if (!json || typeof json.name !== "string" || typeof json.value !== "number") {
      return new NextResponse(null, { status: 400 });
    }

    // Persist to web_vitals table asynchronously
    try {
      const { getSupabaseAdmin } = await import("@/lib/admin/supabase-admin");
      const supabaseAdmin = getSupabaseAdmin();
      void supabaseAdmin.from("web_vitals").insert({
        metric: json.name,
        value: json.value,
        rating: json.rating || "good",
        path: json.path || "/",
      });
    } catch {
      // ignore telemetry write failures
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Web Vital] ${json.name}: ${json.value} (${json.rating || "unrated"}) - Path: ${json.path || "/"}`);
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
