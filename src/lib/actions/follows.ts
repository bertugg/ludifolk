"use server";

import { createClient } from "@/lib/supabase/server";

export async function toggleFollow(targetProfileId: string): Promise<{ following: boolean }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("Not authenticated");
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", targetProfileId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return { following: false };
  }

  await supabase.from("follows").insert({ follower_id: auth.user.id, following_id: targetProfileId });
  return { following: true };
}
