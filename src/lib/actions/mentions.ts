"use server";

import { createClient } from "@/lib/supabase/server";

export type MentionCandidate = { username: string; display_name: string | null; avatar_url: string | null };

export async function searchMentionCandidates(prefix: string): Promise<MentionCandidate[]> {
  const query = prefix.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,20}$/.test(query)) return [];

  const supabase = await createClient();
  // `_` is a LIKE wildcard and common in usernames — escape it.
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .ilike("username", `${query.replace(/_/g, "\\_")}%`)
    .order("username")
    .limit(6);
  return data ?? [];
}
