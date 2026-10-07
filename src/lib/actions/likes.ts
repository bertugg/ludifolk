"use server";

import { createClient } from "@/lib/supabase/server";

export async function toggleLike(sessionId: string): Promise<{ liked: boolean }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("Not authenticated");
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("game_session_id", sessionId)
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    return { liked: false };
  }

  await supabase.from("likes").insert({ game_session_id: sessionId, profile_id: auth.user.id });
  return { liked: true };
}
