"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCategoryTotal, parseScoringSchema, playerCategories, teamCategories } from "@/lib/scoring";
import { MAX_SESSION_PHOTOS, MAX_SESSION_PHOTO_BYTES } from "@/lib/photo-limits";

type ParticipantResult = {
  name: string;
  score: number | null;
  position: number | null;
  isWinner: boolean;
};

export type LogGameFormState =
  | { error: string }
  | {
      success: {
        sessionId: string;
        gameTitle: string;
        players: ParticipantResult[];
        cooperativeOutcome: "win" | "loss" | null;
      };
    }
  | null;

type ParsedRow = {
  id: string;
  name: string;
  score: string;
  position: string;
  winner: boolean;
  breakdown: Record<string, string>;
};

function parseRows(formData: FormData): ParsedRow[] {
  const rows = new Map<string, ParsedRow>();
  const get = (id: string) => {
    const existing = rows.get(id);
    if (existing) return existing;
    const fresh: ParsedRow = { id, name: "", score: "", position: "", winner: false, breakdown: {} };
    rows.set(id, fresh);
    return fresh;
  };

  for (const [key, value] of formData.entries()) {
    const simple = key.match(/^participant-(.+)-(name|score|position|winner)$/);
    if (simple) {
      const [, id, field] = simple;
      const row = get(id);
      if (field === "winner") row.winner = true;
      else row[field as "name" | "score" | "position"] = String(value);
      continue;
    }
    const category = key.match(/^participant-(.+)-cat-(.+)$/);
    if (category) {
      const [, id, categoryKey] = category;
      const strValue = String(value).trim();
      if (strValue) get(id).breakdown[categoryKey] = strValue;
    }
  }
  return [...rows.values()].filter((r) => r.name.trim().length > 0);
}

function parseTeamBreakdown(formData: FormData): Record<string, string> {
  const breakdown: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^team-cat-(.+)$/);
    if (!match) continue;
    const strValue = String(value).trim();
    if (strValue) breakdown[match[1]] = strValue;
  }
  return breakdown;
}

function toNumericBreakdown(raw: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const num = Number.parseFloat(value);
    if (Number.isFinite(num)) result[key] = num;
  }
  return result;
}

export async function logGame(
  _prevState: LogGameFormState,
  formData: FormData,
): Promise<LogGameFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const gameId = String(formData.get("game_id") ?? "");
  if (!gameId) {
    return { error: "Pick a game." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, slug, title, scoring_type, scoring_schema")
    .eq("id", gameId)
    .maybeSingle();

  if (!game) {
    return { error: "That game could not be found." };
  }

  const schema = parseScoringSchema(game.scoring_schema);
  const playerCats = playerCategories(schema);
  const teamCats = teamCategories(schema);

  const rows = parseRows(formData);
  if (rows.length === 0) {
    return { error: "Add at least one player." };
  }

  const playedAt = String(formData.get("played_at") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const rawGroupIdField = String(formData.get("group_id") ?? "").trim();
  const rawGroupId = rawGroupIdField && rawGroupIdField !== "none" ? rawGroupIdField : null;
  let groupId: string | null = null;
  if (rawGroupId) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", rawGroupId)
      .eq("profile_id", auth.user.id)
      .maybeSingle();
    // Silently drop an invalid/foreign group_id rather than erroring — the
    // picker only ever offers the user's own groups, so this only matters
    // against a tampered request.
    groupId = membership ? rawGroupId : null;
  }

  // Resolve each name to an existing Boardly user (exact username match) or
  // treat it as a guest. No search/autocomplete yet — that's Game Search.
  const usedProfileIds = new Set<string>();
  const resolved: {
    profile_id: string | null;
    guest_name: string | null;
    display: string;
    score: number | null;
    position: number | null;
    is_winner: boolean;
    score_breakdown: Record<string, number> | null;
  }[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", name)
      .maybeSingle();

    const linked = profile && !usedProfileIds.has(profile.id);
    if (linked) usedProfileIds.add(profile!.id);

    // The category breakdown is only meaningful for numeric-scoring games
    // that actually define player categories; for everything else it's
    // silently ignored even if present (defensive against a stale/tampered
    // request after switching games in the UI).
    const numericBreakdown =
      game.scoring_type === "numeric" && playerCats.length > 0 ? toNumericBreakdown(row.breakdown) : {};
    const scoreBreakdown = Object.keys(numericBreakdown).length > 0 ? numericBreakdown : null;
    // Never trust a client-computed total — recompute server-side, and
    // only when every contributing category is actually present (a partial
    // breakdown must not be silently summed as if it were complete).
    const computedTotal = scoreBreakdown ? computeCategoryTotal(numericBreakdown, playerCats) : null;

    resolved.push({
      profile_id: linked ? profile!.id : null,
      guest_name: linked ? null : name,
      display: linked ? profile!.display_name || profile!.username : name,
      score: computedTotal ?? (row.score.trim() ? Number.parseFloat(row.score) : null),
      position: row.position.trim() ? Number.parseInt(row.position, 10) : null,
      is_winner: row.winner,
      score_breakdown: scoreBreakdown,
    });
  }

  // The picker only ever offers the selected group's roster, so this only
  // matters against a tampered request — a group session can't include
  // guests or players outside the group.
  if (groupId) {
    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("profile_id")
      .eq("group_id", groupId);
    const memberIds = new Set((groupMembers ?? []).map((m) => m.profile_id));
    const allMembers = resolved.every((r) => r.profile_id !== null && memberIds.has(r.profile_id));
    if (!allMembers) {
      return { error: "Every player must be a member of the selected group." };
    }
  }

  let cooperativeOutcome: "win" | "loss" | null = null;
  let cooperativeScore: number | null = null;

  if (game.scoring_type === "numeric") {
    const scores = resolved.map((r) => r.score).filter((s): s is number => s !== null);
    const max = scores.length ? Math.max(...scores) : null;
    resolved.forEach((r) => {
      r.is_winner = max !== null && r.score === max;
    });
  } else if (game.scoring_type === "position") {
    resolved.forEach((r) => {
      r.is_winner = r.position === 1;
    });
  } else if (game.scoring_type === "cooperative") {
    cooperativeOutcome = formData.get("cooperative_outcome") === "win" ? "win" : "loss";
    const rawScore = String(formData.get("cooperative_score") ?? "").trim();
    cooperativeScore = rawScore ? Number.parseInt(rawScore, 10) : null;
    resolved.forEach((r) => {
      r.score = null;
      r.position = null;
      r.is_winner = cooperativeOutcome === "win";
    });
  }
  // winner_only: r.is_winner already set from the checkbox, left as-is.

  const teamBreakdownRaw = teamCats.length > 0 ? toNumericBreakdown(parseTeamBreakdown(formData)) : {};
  const teamDetails = Object.keys(teamBreakdownRaw).length > 0 ? teamBreakdownRaw : null;

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      game_id: game.id,
      created_by: auth.user.id,
      played_at: playedAt ?? undefined,
      location,
      notes,
      group_id: groupId,
      cooperative_outcome: cooperativeOutcome,
      cooperative_score: cooperativeScore,
      team_details: teamDetails,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Could not create the session." };
  }

  const { error: participantsError } = await supabase.from("game_participants").insert(
    resolved.map((r) => ({
      session_id: session.id,
      profile_id: r.profile_id,
      guest_name: r.guest_name,
      score: r.score,
      position: r.position,
      is_winner: r.is_winner,
      score_breakdown: r.score_breakdown,
      added_by: auth.user!.id,
    })),
  );

  if (participantsError) {
    await supabase.from("game_sessions").delete().eq("id", session.id);
    if (participantsError.code === "23505") {
      return { error: "You added the same person twice." };
    }
    return { error: participantsError.message };
  }

  await supabase.from("activities").insert({
    profile_id: auth.user.id,
    activity_type: "game_session",
    game_session_id: session.id,
  });

  const photoFiles = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= MAX_SESSION_PHOTO_BYTES)
    .slice(0, MAX_SESSION_PHOTOS);
  for (const file of photoFiles) {
    const path = `${session.id}/${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage.from("session-photos").upload(path, file, {
      contentType: file.type,
    });
    if (!uploadError) {
      await supabase.from("photos").insert({
        game_session_id: session.id,
        uploaded_by: auth.user.id,
        storage_path: path,
      });
    }
  }

  return {
    success: {
      sessionId: session.id,
      gameTitle: game.title,
      cooperativeOutcome,
      players: resolved.map((r) => ({
        name: r.display,
        score: r.score,
        position: r.position,
        isWinner: r.is_winner,
      })),
    },
  };
}
