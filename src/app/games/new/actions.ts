"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { SCORING_TYPES, type ScoringType } from "@/lib/games";

export type CreateGameFormState = { error: string } | null;

function toInt(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toList(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createGame(
  _prevState: CreateGameFormState,
  formData: FormData,
): Promise<CreateGameFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Title is required." };
  }

  const scoringType = String(formData.get("scoring_type") ?? "numeric");
  if (!SCORING_TYPES.some((t) => t.value === scoringType)) {
    return { error: "Invalid scoring type." };
  }

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    publisher: String(formData.get("publisher") ?? "").trim() || null,
    year_published: toInt(formData.get("year_published")),
    min_players: toInt(formData.get("min_players")),
    max_players: toInt(formData.get("max_players")),
    playtime_minutes_min: toInt(formData.get("playtime_minutes_min")),
    playtime_minutes_max: toInt(formData.get("playtime_minutes_max")),
    categories: toList(formData.get("categories")),
    mechanics: toList(formData.get("mechanics")),
    scoring_type: scoringType as ScoringType,
    created_by: auth.user.id,
  };

  const baseSlug = slugify(title) || "game";

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("games").insert({ ...payload, slug });

    if (!error) {
      redirect(`/games/${slug}`);
    }
    if (error.code !== "23505") {
      return { error: error.message };
    }
    // slug collision — retry with a suffixed slug
  }

  return { error: "Could not generate a unique URL for this game. Try a different title." };
}
