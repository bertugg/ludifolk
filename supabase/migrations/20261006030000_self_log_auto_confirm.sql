-- The session creator's own participant row shouldn't need confirming —
-- they just confirmed it by logging the session. Only *other* linked users
-- (profile_id set, added_by someone else) stay pending until step 9
-- (Participant Confirmation).

create or replace function public.confirm_guest_participant()
returns trigger
language plpgsql
as $$
begin
  if new.profile_id is null or new.profile_id = new.added_by then
    new.confirmation_status = 'confirmed';
  end if;
  return new;
end;
$$;
