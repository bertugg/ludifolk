-- When a session creator adds another Ludifolk user as a participant, that
-- user needs to find out and confirm/decline (step 9, Participant
-- Confirmation). Direct client inserts into `notifications` are blocked by
-- RLS (no insert policy — see the init migration's comment on that table),
-- so this has to happen via a SECURITY DEFINER trigger rather than the
-- logging server action inserting the row itself.

create function public.notify_participant_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is not null and new.profile_id != new.added_by then
    insert into public.notifications (profile_id, actor_id, type, game_session_id)
    values (new.profile_id, new.added_by, 'participant_confirmation_request', new.session_id);
  end if;
  return new;
end;
$$;

create trigger notify_participant_added_on_insert
  after insert on public.game_participants
  for each row execute function public.notify_participant_added();
