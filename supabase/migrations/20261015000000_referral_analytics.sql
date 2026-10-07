-- Backend-only referral analytics (no UI yet — see roadmap). Tracks the
-- funnel from section 27 of the product brief: referral source is captured
-- at signup via a cookie set when visiting a shared public page with a
-- `?ref=` marker (see src/lib/supabase/middleware.ts), passed through as
-- signup metadata the same way `username` already is. Activation and
-- first-game-logged are set by triggers at the exact moments described in
-- the referral flow ("Accept Participation" and logging a session).

alter table public.profiles
  add column referral_source text,
  add column activated_at timestamptz,
  add column first_game_logged_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, referral_source)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'referral_source'
  );
  return new;
end;
$$;

-- Activation: the referral flow's "Accept Participation" step — the first
-- time someone confirms a participant row someone else added them to.
-- (Self-logged rows are auto-confirmed on insert, not update, so this only
-- fires for a genuine accept action.)
create function public.mark_activated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.confirmation_status = 'confirmed'
     and old.confirmation_status <> 'confirmed'
     and new.profile_id is not null then
    update public.profiles
    set activated_at = now()
    where id = new.profile_id and activated_at is null;
  end if;
  return new;
end;
$$;

create trigger mark_activated_on_confirm
  after update on public.game_participants
  for each row execute function public.mark_activated();

create function public.mark_first_game_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set first_game_logged_at = now()
  where id = new.created_by and first_game_logged_at is null;
  return new;
end;
$$;

create trigger mark_first_game_logged_on_session_insert
  after insert on public.game_sessions
  for each row execute function public.mark_first_game_logged();
