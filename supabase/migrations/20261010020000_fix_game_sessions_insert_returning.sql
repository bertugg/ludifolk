-- The previous migration made game_sessions_select call
-- can_view_game_session(id), which internally re-queries game_sessions
-- itself. That broke `INSERT ... RETURNING` on game_sessions: Postgres
-- evaluates the SELECT policy against the newly-inserted row for RETURNING,
-- and a SECURITY DEFINER function doing a fresh subquery into the same
-- table being inserted into can't resolve it ("new row violates row-level
-- security policy"). Revert to an inline policy (checking columns on the
-- row directly, no self-referential subquery) — but this time it actually
-- includes the group-membership clause that was the point of all this.

drop policy "game_sessions_select" on public.game_sessions;

create policy "game_sessions_select" on public.game_sessions
  for select using (
    visibility = 'public'
    or created_by = auth.uid()
    or public.is_session_participant(id)
    or (group_id is not null and public.is_group_member(group_id))
  );
