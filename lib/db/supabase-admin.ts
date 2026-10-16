/*
 * File: lib/db/supabase-admin.ts
 * Description: Creates a server-only Supabase admin client for API route persistence operations.
 * Functions:
 * - getSupabaseAdminClient: Returns a service-role Supabase client or null when env vars are missing.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  // This creates a server-side client with elevated privileges for controlled API writes.
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
