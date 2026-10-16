<!--
File: README.md
Description: Documents local setup, cloud configuration, and deployment flow for BuddyMine Chess Coach MVP.
Functions:
- This file explains installation, environment variables, Supabase setup, and Vercel deployment.
-->

# BuddyMine Chess Coach

Standalone MVP chess coaching web app where users play against an engine and receive live guidance plus a post-game review.

## 1) Local Setup

1. Install Node.js 20 LTS and pnpm.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
4. Start dev server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## 2) Environment Variables

Set these in `.env.local` and in Vercel project env settings:

- `NEXT_PUBLIC_APP_NAME=BuddyMine Chess Coach`
- `NEXT_PUBLIC_ENABLE_CLOUD_SAVE=false` (set `true` to enable Supabase writes)
- `NEXT_PUBLIC_SUPABASE_URL=` (required only for cloud save)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (required only for cloud save)
- `SUPABASE_SERVICE_ROLE_KEY=` (required only for cloud save API writes)

## 3) Supabase Setup (Optional Cloud Save)

1. Create a project in [Supabase Dashboard](https://supabase.com/dashboard).
2. Open SQL Editor and run:
   - `supabase/schema.sql`
   - `supabase/rls.sql` (optional, recommended)
3. Copy project URL + keys into `.env.local` and Vercel.

## 4) Vercel Deploy

1. Push repo to GitHub.
2. Import project at [Vercel New Project](https://vercel.com/new).
3. Confirm framework is Next.js.
4. Add all required env vars in Vercel.
5. Deploy and share the generated URL.

## 5) MVP Scope Implemented

- Landing page, play page, games list, and review page.
- Play against Stockfish engine via web worker.
- Live move classification and plain-English coach messages.
- Opening detection and post-game summary generation.
- Local save by default; optional Supabase cloud save API routes.

## 6) Licensing Note

This project uses Stockfish (`GPL-3.0`). Keep attribution and license terms when distributing builds.
