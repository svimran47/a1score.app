import React from "react";
import type { Metadata } from "next";
import { Wrench, RefreshCw } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/admin/supabase-admin";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Under Maintenance | a1score",
  description: "a1score is currently undergoing scheduled platform maintenance.",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  let message = "We are currently performing scheduled maintenance to upgrade our platform. Please check back shortly.";

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("app_config")
      .select("maintenance_message")
      .eq("id", "default")
      .maybeSingle();

    if (data?.maintenance_message) {
      message = data.maintenance_message;
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-page)] text-[var(--text-primary)]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider)] shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <Wrench className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Platform Maintenance
          </h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-chip)] hover:bg-[var(--bg-hover)] border border-[var(--divider)] text-xs font-bold text-[var(--text-primary)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status</span>
          </a>
        </div>
      </div>
    </div>
  );
}
