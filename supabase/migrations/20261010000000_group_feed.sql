-- Phase 2, step 3: Group Feed. Sessions can optionally be tagged to a
-- group they were logged for. Group membership extends visibility: any
-- member can see a session tagged to their group, regardless of that
-- session's own public/private visibility — tagging a session to a group
-- is an explicit act of sharing it with that group.

alter table public.game_sessions
  add column group_id uuid references public.groups (id) on delete set null;

create index idx_game_sessions_group on public.game_sessions (group_id);

create or replace function public.can_view_game_session(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.game_sessions
    where id = p_session_id
      and (
        visibility = 'public'
        or created_by = auth.uid()
        or public.is_session_participant(p_session_id)
        or (group_id is not null and public.is_group_member(group_id))
      )
  );
$$;
