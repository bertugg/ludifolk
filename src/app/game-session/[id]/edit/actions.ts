"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeCategoryTotal, parseScoringSchema, playerCategories, teamCategories } from "@/lib/scoring";

export type EditResultFormState = { error: string } | null;

function toNumericBreakdown(raw: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const num = Number.parseFloat(value);
    if (Number.isFinite(num)) result[key] = num;
  }
  return result;
}

export async function updateGameResult(
  _prevState: EditResultFormState,
  formData: FormData,
): Promise<EditResultFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const sessionId = String(formData.get("session_id") ?? "");
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, created_by, game:games ( scoring_type, scoring_schema )")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || !session.game) {
    return { error: "This result could not be found." };
  }
  if (session.created_by !== auth.user.id) {
    return { error: "Only the person who logged this result can edit it." };
  }

  const scoringType = session.game.scoring_type;
  const schema = parseScoringSchema(session.game.scoring_schema);
  const playerCats = playerCategories(schema);
  const teamCats = teamCategories(schema);

  const playedAt = String(formData.get("played_at") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const participantIds = formData.getAll("participant_id").map(String);
  if (participantIds.length === 0) {
    return { error: "This result has no players to update." };
  }

  const updates = participantIds.map((pid) => {
    const score = String(formData.get(`participant-${pid}-score`) ?? "");
    const position = String(formData.get(`participant-${pid}-position`) ?? "");
    const winner = formData.get(`participant-${pid}-winner`) === "on";

    const rawBreakdown: Record<string, string> = {};
    if (scoringType === "numeric" && playerCats.length > 0) {
      for (const cat of playerCats) {
        const value = String(formData.get(`participant-${pid}-cat-${cat.key}`) ?? "").trim();
        if (value) rawBreakdown[cat.key] = value;
      }
    }
    const numericBreakdown = toNumericBreakdown(rawBreakdown);
    const scoreBreakdown = Object.keys(numericBreakdown).length > 0 ? numericBreakdown : null;
    const computedTotal = scoreBreakdown ? computeCategoryTotal(numericBreakdown, playerCats) : null;

    return {
      id: pid,
      score: computedTotal ?? (score.trim() ? Number.parseFloat(score) : null),
      position: position.trim() ? Number.parseInt(position, 10) : null,
      is_winner: winner,
      score_breakdown: scoreBreakdown,
    };
  });

  // Recompute winners the same way the initial log action does, so editing
  // scores can't leave a stale/incorrect winner behind.
  if (scoringType === "numeric") {
    const scores = updates.map((u) => u.score).filter((s): s is number => s !== null);
    const max = scores.length ? Math.max(...scores) : null;
    updates.forEach((u) => {
      u.is_winner = max !== null && u.score === max;
    });
  } else if (scoringType === "position") {
    updates.forEach((u) => {
      u.is_winner = u.position === 1;
    });
  }

  let cooperativeOutcome: "win" | "loss" | null = null;
  let cooperativeScore: number | null = null;
  let teamDetails: Record<string, number> | null = null;

  if (scoringType === "cooperative") {
    cooperativeOutcome = formData.get("cooperative_outcome") === "win" ? "win" : "loss";
    const rawScore = String(formData.get("cooperative_score") ?? "").trim();
    cooperativeScore = rawScore ? Number.parseInt(rawScore, 10) : null;
    updates.forEach((u) => {
      u.score = null;
      u.position = null;
      u.is_winner = cooperativeOutcome === "win";
    });
  }

  if (teamCats.length > 0) {
    const rawTeam: Record<string, string> = {};
    for (const cat of teamCats) {
      const value = String(formData.get(`team-cat-${cat.key}`) ?? "").trim();
      if (value) rawTeam[cat.key] = value;
    }
    const numericTeam = toNumericBreakdown(rawTeam);
    teamDetails = Object.keys(numericTeam).length > 0 ? numericTeam : null;
  }

  const { error: sessionError } = await supabase
    .from("game_sessions")
    .update({
      played_at: playedAt ?? undefined,
      location,
      notes,
      cooperative_outcome: cooperativeOutcome,
      cooperative_score: cooperativeScore,
      team_details: teamDetails,
    })
    .eq("id", sessionId);

  if (sessionError) {
    return { error: sessionError.message };
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("game_participants")
      .update({
        score: u.score,
        position: u.position,
        is_winner: u.is_winner,
        score_breakdown: u.score_breakdown,
      })
      .eq("id", u.id);
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath(`/game-session/${sessionId}`);
  redirect(`/game-session/${sessionId}`);
}
