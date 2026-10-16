/*
 * File: lib/db/supabase-client.ts
 * Description: Creates a browser-safe Supabase client for optional cloud save usage.
 * Functions:
 * - getSupabaseBrowserClient: Lazily returns a configured Supabase browser client or null.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  // This prevents server-side execution for browser-only client code.
  if (typeof window === "undefined") return null;

  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  browserClient = createClient(url, anonKey);
  return browserClient;
}
