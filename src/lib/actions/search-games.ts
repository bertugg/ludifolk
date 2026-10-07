"use server";

import { createClient } from "@/lib/supabase/server";

export type GameSummary = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  scoring_type: string;
  min_players: number | null;
  max_players: number | null;
  playtime_minutes_min: number | null;
  playtime_minutes_max: number | null;
  scoring_schema: unknown;
};

const SUMMARY_COLUMNS =
  "id, slug, title, image_url, scoring_type, min_players, max_players, playtime_minutes_min, playtime_minutes_max, scoring_schema";

export async function searchGames(query: string, limit = 8): Promise<GameSummary[]> {
  const supabase = await createClient();
  const trimmed = query.trim();

  let q = supabase.from("games").select(SUMMARY_COLUMNS).order("title").limit(limit);
  if (trimmed) {
    q = q.ilike("title", `%${trimmed}%`);
  }

  const { data } = await q;
  return data ?? [];
}
