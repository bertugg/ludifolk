-- Phase 2, step 1: Following. Asymmetric follow graph (not mutual "friends").
-- No approval workflow for private profiles — following doesn't bypass
-- session-level visibility, which is already governed separately by
-- game_sessions.visibility and participant membership.

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_not_self check (follower_id <> following_id),
  unique (follower_id, following_id)
);

create index idx_follows_follower on public.follows (follower_id);
create index idx_follows_following on public.follows (following_id);

alter table public.follows enable row level security;

-- Public follow graph (who-follows-whom is not sensitive), matching the
-- same posture as the public games catalog.
create policy "follows_select_all" on public.follows
  for select using (true);

create policy "follows_insert_self" on public.follows
  for insert with check (follower_id = auth.uid());

create policy "follows_delete_self" on public.follows
  for delete using (follower_id = auth.uid());
