-- "mention" notifications: someone tagged you with @username in a game
-- session's notes or in a comment. Done in triggers (like new_follower)
-- so every write path is covered, and because notifications have no
-- INSERT policy for plain users.
--
-- No visibility check here: if the recipient can't view the session, the
-- notifications page's session join comes back null and the row isn't
-- shown (and it appears if they later gain access).

alter table public.notifications
  add column comment_id uuid references public.comments (id) on delete cascade;

-- Profile ids tagged in a piece of text. The pattern mirrors
-- MENTION_PATTERN in src/lib/mentions.ts.
create function public.mentioned_profile_ids(p_text text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.username in (
    select lower(m[1])
    from regexp_matches(coalesce(p_text, ''), '(?<![a-z0-9_.])@([a-z0-9_]{3,20})(?![a-z0-9_])', 'gi') as m
  );
$$;

create function public.notify_mentions_in_session_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
begin
  insert into public.notifications (profile_id, actor_id, type, game_session_id)
  select tagged.id, v_actor, 'mention', new.id
  from public.mentioned_profile_ids(new.notes) as tagged(id)
  where tagged.id <> v_actor
    -- On edit, only people who weren't already tagged.
    and (tg_op = 'INSERT' or tagged.id not in (select public.mentioned_profile_ids(old.notes)));
  return new;
end;
$$;

create trigger notify_mentions_on_session_insert
  after insert on public.game_sessions
  for each row when (new.notes is not null)
  execute function public.notify_mentions_in_session_notes();

create trigger notify_mentions_on_session_notes_update
  after update of notes on public.game_sessions
  for each row when (new.notes is distinct from old.notes)
  execute function public.notify_mentions_in_session_notes();

create function public.notify_mentions_in_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, actor_id, type, game_session_id, comment_id)
  select tagged.id, new.profile_id, 'mention', new.game_session_id, new.id
  from public.mentioned_profile_ids(new.body) as tagged(id)
  where tagged.id <> new.profile_id;
  return new;
end;
$$;

create trigger notify_mentions_on_comment_insert
  after insert on public.comments
  for each row execute function public.notify_mentions_in_comment();
