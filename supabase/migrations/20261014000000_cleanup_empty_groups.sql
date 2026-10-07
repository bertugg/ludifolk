-- A group with no members left (last member left, or an owner removed
-- everyone) is dead weight with no one who can ever see or act on it again
-- (groups RLS requires membership/creator/invitation). Delete it outright
-- rather than leaving an orphaned row. game_sessions.group_id is ON DELETE
-- SET NULL, so past logged games stay intact, just un-grouped.

create function public.cleanup_empty_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.group_members where group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
  end if;
  return old;
end;
$$;

create trigger cleanup_empty_group_on_member_delete
  after delete on public.group_members
  for each row execute function public.cleanup_empty_group();
