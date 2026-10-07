-- Phase 2, step 2: Groups. Core entity + membership only — group-scoped
-- feed/leaderboard/stats (tying game_sessions to a group) is step 3 (Group
-- Feed); a formal invite/accept flow is step 5 (Invitations). For now,
-- members are added directly, same pattern as adding participants when
-- logging a game.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  avatar_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  added_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (group_id, profile_id)
);

create index idx_groups_created_by on public.groups (created_by);
create index idx_group_members_group on public.group_members (group_id);
create index idx_group_members_profile on public.group_members (profile_id);

create function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and profile_id = auth.uid()
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Groups are visible to their members only — more private than the public
-- games catalog, matching the "real-world friend group" framing in the spec.
create policy "groups_select_members" on public.groups
  for select using (public.is_group_member(id) or created_by = auth.uid());

create policy "groups_insert_self" on public.groups
  for insert with check (created_by = auth.uid());

create policy "groups_update_owner" on public.groups
  for update using (
    exists (
      select 1 from public.group_members
      where group_id = id and profile_id = auth.uid() and role = 'owner'
    )
  );

create policy "group_members_select" on public.group_members
  for select using (public.is_group_member(group_id));

-- Any current member can add someone ("Members can invite people" per spec);
-- the group creator can also add the bootstrap first member (themselves)
-- before any group_members row exists yet.
create policy "group_members_insert" on public.group_members
  for insert with check (
    added_by = auth.uid()
    and (
      exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
      or public.is_group_member(group_id)
    )
  );

-- Members can remove themselves (leave); owners can remove anyone.
create policy "group_members_delete" on public.group_members
  for delete using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.profile_id = auth.uid() and gm.role = 'owner'
    )
  );
