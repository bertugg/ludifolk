-- The game_sessions table's own SELECT policy had its own hand-duplicated
-- copy of the visibility logic instead of calling can_view_game_session(),
-- unlike every other table (game_participants, activities, likes, comments,
-- photos) which correctly delegates to it. That meant the previous
-- migration's group-visibility extension to can_view_game_session() silently
-- didn't apply to game_sessions itself — group members could see a grouped
-- session's participants/likes/comments via other tables' policies, but not
-- the session row itself. Delegate to the shared function so this class of
-- drift can't happen again.

drop policy "game_sessions_select" on public.game_sessions;

create policy "game_sessions_select" on public.game_sessions
  for select using (public.can_view_game_session(id));
