/*
 * File: supabase/rls.sql
 * Description: Provides baseline row level security setup for the games table in MVP cloud mode.
 * Functions:
 * - This script enables RLS and defines conservative read policy by client id.
 */

-- This enables row-level security for defense-in-depth even with server-side writes.
alter table public.games enable row level security;

-- This allows authenticated/anon reads only for rows matching a provided client id claim.
-- Note: for MVP we use service-role writes through API routes, so this policy is optional.
create policy if not exists "games_select_by_client_id"
on public.games
for select
using (
  client_id = coalesce(current_setting('request.jwt.claim.client_id', true), '')
);
