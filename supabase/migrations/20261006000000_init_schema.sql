-- Boardly — Phase 1 schema
-- Covers: profiles, game catalog, game sessions/participants (the logging core),
-- feed (activities, likes, comments), notifications (needed for participant
-- confirmation), and photos.
--
-- Not included yet (added in their respective phases):
--   groups, group_members, follows            -> Phase 2 (Social Graph)
--   achievements, challenges, ratings          -> Phase 3+
--   referrals, analytics_events                -> later
--
-- `visibility`/`privacy` currently only support 'public' | 'private'. The
-- 'friends' | 'groups' levels described in the product spec depend on the
-- Phase 2 social graph (follows/groups) and will be added as enum values in
-- that phase's migration, once there is a graph to evaluate them against.

create extension if not exists "pgcrypto";

-- ───────────────────────── helper: updated_at trigger ─────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────── profiles ─────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up. Username is a
-- random placeholder; onboarding (step 2) lets the user pick a real one.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────── games ───────────────────────────────────

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  image_url text,
  publisher text,
  year_published integer,
  min_players integer,
  max_players integer,
  playtime_minutes_min integer,
  playtime_minutes_max integer,
  categories text[] not null default '{}',
  mechanics text[] not null default '{}',
  scoring_type text not null default 'numeric'
    check (scoring_type in ('numeric', 'position', 'winner_only', 'cooperative')),
  bgg_id integer unique, -- external BoardGameGeek id; populated once an integration layer exists
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_games_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

-- ─────────────────────────────── game_sessions ───────────────────────────────
-- One specific instance of a game being played — the "social object" at the
-- heart of the product. Not the same as `games` (the catalog entry).

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete cascade,
  played_at date not null default current_date,
  location text,
  notes text,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  -- Only meaningful when games.scoring_type = 'cooperative'.
  cooperative_outcome text check (cooperative_outcome in ('win', 'loss')),
  cooperative_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_game_sessions_updated_at
  before update on public.game_sessions
  for each row execute function public.set_updated_at();

create index idx_game_sessions_game on public.game_sessions (game_id);
create index idx_game_sessions_creator on public.game_sessions (created_by);
create index idx_game_sessions_played_at on public.game_sessions (played_at desc);

-- ───────────────────────────── game_participants ─────────────────────────────
-- A single person's participation in a session. `profile_id` is null for
-- guests who aren't on Boardly yet (identified by `guest_name` instead) —
-- guests are auto-confirmed since they can't confirm themselves.

create table public.game_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  score numeric,
  position integer,
  is_winner boolean not null default false,
  confirmation_status text not null default 'pending'
    check (confirmation_status in ('pending', 'confirmed', 'declined')),
  added_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_is_identified check (profile_id is not null or guest_name is not null)
);

create trigger set_game_participants_updated_at
  before update on public.game_participants
  for each row execute function public.set_updated_at();

create function public.confirm_guest_participant()
returns trigger
language plpgsql
as $$
begin
  if new.profile_id is null then
    new.confirmation_status = 'confirmed';
  end if;
  return new;
end;
$$;

create trigger confirm_guest_participant_on_insert
  before insert on public.game_participants
  for each row execute function public.confirm_guest_participant();

create index idx_game_participants_session on public.game_participants (session_id);
create index idx_game_participants_profile on public.game_participants (profile_id);
create unique index idx_game_participants_unique_profile
  on public.game_participants (session_id, profile_id)
  where profile_id is not null;

-- ─────────────────────── RLS helpers for session visibility ───────────────────────

create function public.is_session_participant(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.game_participants
    where session_id = p_session_id and profile_id = auth.uid()
  );
$$;

create function public.can_view_game_session(p_session_id uuid)
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
      )
  );
$$;

-- ──────────────────────────────── activities ────────────────────────────────
-- A thin, append-only feed index. Kept separate from game_sessions so future
-- activity types (achievements, etc.) don't require reshaping the session
-- table.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  activity_type text not null default 'game_session',
  game_session_id uuid references public.game_sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_activities_profile_created on public.activities (profile_id, created_at desc);
create index idx_activities_session on public.activities (game_session_id);

-- ────────────────────────────────── likes ──────────────────────────────────

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_session_id, profile_id)
);

create index idx_likes_session on public.likes (game_session_id);

-- ──────────────────────────────── comments ────────────────────────────────

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create index idx_comments_session_created on public.comments (game_session_id, created_at);

-- ─────────────────────────────── notifications ───────────────────────────────
-- No INSERT policy for plain authenticated users — notifications that need to
-- land in *someone else's* inbox (e.g. a confirmation request) must go through
-- a SECURITY DEFINER function or service-role server action (Log Game phase),
-- not a direct client insert.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade, -- recipient
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  game_session_id uuid references public.game_sessions (id) on delete cascade,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile_created on public.notifications (profile_id, created_at desc);
create index idx_notifications_profile_unread on public.notifications (profile_id) where is_read = false;

-- ───────────────────────────────── photos ─────────────────────────────────

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index idx_photos_session on public.photos (game_session_id);

-- ════════════════════════════════════ RLS ════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_participants enable row level security;
alter table public.activities enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.photos enable row level security;

-- profiles: public profiles are readable by anyone; private ones only by
-- their owner (friends/groups-scoped visibility arrives with the Phase 2 graph).
create policy "profiles_select" on public.profiles
  for select using (privacy = 'public' or id = auth.uid());

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- games: shared catalog. Anyone can read; any authenticated user can add a
-- missing game (Game Search "add new" flow); edits/deletes are admin-only
-- (no policy = denied until that tooling exists).
create policy "games_select_all" on public.games
  for select using (true);

create policy "games_insert_authenticated" on public.games
  for insert to authenticated with check (true);

-- game_sessions
create policy "game_sessions_select" on public.game_sessions
  for select using (
    visibility = 'public'
    or created_by = auth.uid()
    or public.is_session_participant(id)
  );

create policy "game_sessions_insert_self" on public.game_sessions
  for insert with check (created_by = auth.uid());

create policy "game_sessions_update_creator" on public.game_sessions
  for update using (created_by = auth.uid());

create policy "game_sessions_delete_creator" on public.game_sessions
  for delete using (created_by = auth.uid());

-- game_participants
create policy "game_participants_select" on public.game_participants
  for select using (
    public.can_view_game_session(session_id) or profile_id = auth.uid()
  );

create policy "game_participants_insert_by_session_creator" on public.game_participants
  for insert with check (
    added_by = auth.uid()
    and exists (
      select 1 from public.game_sessions
      where id = session_id and created_by = auth.uid()
    )
  );

create policy "game_participants_update" on public.game_participants
  for update using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.game_sessions
      where id = session_id and created_by = auth.uid()
    )
  );

create policy "game_participants_delete" on public.game_participants
  for delete using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.game_sessions
      where id = session_id and created_by = auth.uid()
    )
  );

-- activities
create policy "activities_select" on public.activities
  for select using (
    (game_session_id is not null and public.can_view_game_session(game_session_id))
    or profile_id = auth.uid()
  );

create policy "activities_insert_self" on public.activities
  for insert with check (profile_id = auth.uid());

-- likes
create policy "likes_select" on public.likes
  for select using (public.can_view_game_session(game_session_id));

create policy "likes_insert_self" on public.likes
  for insert with check (profile_id = auth.uid() and public.can_view_game_session(game_session_id));

create policy "likes_delete_self" on public.likes
  for delete using (profile_id = auth.uid());

-- comments
create policy "comments_select" on public.comments
  for select using (public.can_view_game_session(game_session_id));

create policy "comments_insert_self" on public.comments
  for insert with check (profile_id = auth.uid() and public.can_view_game_session(game_session_id));

create policy "comments_update_self" on public.comments
  for update using (profile_id = auth.uid());

create policy "comments_delete_self" on public.comments
  for delete using (profile_id = auth.uid());

-- notifications: recipient-only. No insert policy on purpose — see comment above.
create policy "notifications_select_self" on public.notifications
  for select using (profile_id = auth.uid());

create policy "notifications_update_self" on public.notifications
  for update using (profile_id = auth.uid());

-- photos
create policy "photos_select" on public.photos
  for select using (public.can_view_game_session(game_session_id));

create policy "photos_insert_self" on public.photos
  for insert with check (
    uploaded_by = auth.uid() and public.can_view_game_session(game_session_id)
  );

create policy "photos_delete" on public.photos
  for delete using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.game_sessions
      where id = game_session_id and created_by = auth.uid()
    )
  );
