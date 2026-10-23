import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL } from "@/lib/supabase";

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return cachedAdmin;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
