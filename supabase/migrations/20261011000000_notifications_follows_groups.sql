-- Phase 2, step 4: Notifications. Extends coverage to the social events
-- Following and Groups introduced, which currently produce zero
-- notification at all — following someone or being added to a group is
-- silent right now.

alter table public.notifications
  add column group_id uuid references public.groups (id) on delete cascade;

create function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, actor_id, type)
  values (new.following_id, new.follower_id, 'new_follower');
  return new;
end;
$$;

create trigger notify_new_follower_on_insert
  after insert on public.follows
  for each row execute function public.notify_new_follower();

create function public.notify_added_to_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id != new.added_by then
    insert into public.notifications (profile_id, actor_id, type, group_id)
    values (new.profile_id, new.added_by, 'added_to_group', new.group_id);
  end if;
  return new;
end;
$$;

create trigger notify_added_to_group_on_insert
  after insert on public.group_members
  for each row execute function public.notify_added_to_group();
