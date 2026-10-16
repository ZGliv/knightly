/*
 * File: app/api/games/[id]/route.ts
 * Description: Fetches one game review record by id from Supabase for cloud-backed review retrieval.
 * Functions:
 * - GET: Returns a single game row by id.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/db/supabase-admin";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud save is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  // This fetches one game by primary key for review rendering.
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ game: data });
}
