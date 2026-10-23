import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/admin/supabase-admin";

export const runtime = "edge";

const DEFAULT_CONFIG = {
  maintenance_mode: false,
  maintenance_message: "We are currently performing scheduled maintenance. Please check back shortly.",
  min_supported_version: "1.0.0",
  latest_version: "1.0.0",
  force_update: false,
  feature_flags: {
    predict: true,
    tv: true,
    news: true,
    compare: true,
    ads: false,
  },
  updated_at: new Date().toISOString(),
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(DEFAULT_CONFIG, {
        headers: {
          "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json(DEFAULT_CONFIG, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      },
    });
  }
}
