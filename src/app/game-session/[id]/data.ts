import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getSessionData = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("game_sessions")
    .select(
      `
        id, played_at, location, notes, cooperative_outcome, cooperative_score, visibility, created_by, team_details,
        game:games ( id, slug, title, image_url, scoring_type, scoring_schema ),
        participants:game_participants (
          id, profile_id, guest_name, score, position, is_winner, confirmation_status, score_breakdown,
          profile:profiles!game_participants_profile_id_fkey ( username, display_name, avatar_url )
        ),
        likes ( profile_id ),
        photos ( id, storage_path )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return session;
});
