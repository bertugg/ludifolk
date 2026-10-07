-- Phase 2, step 5: Invitations. Replaces direct "any member can add anyone
-- to the group" with invite -> accept/decline. Closes the gap flagged when
-- Groups first shipped: adding someone to a group shouldn't be something
-- another person can do to you without consent.

create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (group_id, invitee_id)
);

create index idx_group_invitations_invitee on public.group_invitations (invitee_id);
create index idx_group_invitations_group on public.group_invitations (group_id);

alter table public.group_invitations enable row level security;

create policy "group_invitations_select" on public.group_invitations
  for select using (invitee_id = auth.uid() or public.is_group_member(group_id));

create policy "group_invitations_insert" on public.group_invitations
  for insert with check (invited_by = auth.uid() and public.is_group_member(group_id));

create policy "group_invitations_update_invitee" on public.group_invitations
  for update using (invitee_id = auth.uid());

-- Direct "add anyone" is gone — group_members can now only ever be a
-- self-insert (the group creator's own bootstrap row, or an invitee
-- accepting). Adding someone else now has to go through group_invitations.
drop policy "group_members_insert" on public.group_members;

create policy "group_members_insert_self" on public.group_members
  for insert with check (profile_id = auth.uid() and added_by = auth.uid());

-- The old "added_to_group" notification fired on any group_members insert
-- where profile_id != added_by — that path no longer exists (inserts are
-- self-only now), so this trigger can never fire again. Replaced by a
-- notification on the invitation itself, which is the moment that actually
-- matters to the invitee now.
drop trigger notify_added_to_group_on_insert on public.group_members;
drop function public.notify_added_to_group();

create function public.notify_group_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, actor_id, type, group_id)
  values (new.invitee_id, new.invited_by, 'group_invitation', new.group_id);
  return new;
end;
$$;

create trigger notify_group_invitation_on_insert
  after insert on public.group_invitations
  for each row execute function public.notify_group_invitation();
