/*
 * File: app/api/games/route.ts
 * Description: Handles cloud persistence operations for saving and listing game reviews via Supabase.
 * Functions:
 * - POST: Stores a completed game review in Supabase.
 * - GET: Lists recent games for a specific client id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/db/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud save is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json();

  // This writes the MVP game payload into the single games table.
  const { error } = await supabase.from("games").insert({
    id: body.id,
    client_id: body.clientId,
    created_at: body.createdAt,
    result: body.result,
    player_color: body.playerColor,
    engine_level: body.engineLevel,
    opening_name: body.openingName,
    pgn: body.pgn,
    fen_final: body.fenFinal,
    summary_json: body.summary,
    review_json: { moves: body.moves },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud save is not configured." },
      { status: 503 },
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId." }, { status: 400 });
  }

  // This fetches newest saved games for the requesting client id.
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: data });
}
