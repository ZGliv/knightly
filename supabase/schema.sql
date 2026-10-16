/*
 * File: supabase/schema.sql
 * Description: Creates the minimal Supabase schema required for BuddyMine cloud game persistence.
 * Functions:
 * - This script creates the games table and useful indexes.
 */

-- This creates the primary games table used for MVP cloud save.
create table if not exists public.games (
  id uuid primary key,
  client_id text not null,
  created_at timestamptz not null default now(),
  result text not null check (result in ('1-0', '0-1', '1/2-1/2', '*')),
  player_color text not null check (player_color in ('white', 'black')),
  engine_level integer not null,
  opening_name text,
  pgn text not null,
  fen_final text not null,
  summary_json jsonb not null,
  review_json jsonb not null
);

-- This index accelerates list queries by anonymous client id.
create index if not exists games_client_id_created_at_idx
  on public.games (client_id, created_at desc);
