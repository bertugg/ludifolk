-- Storage bucket backing the `photos` table (session_id/filename paths).
-- Kept private — a public bucket would serve object bytes to anyone with
-- the URL with no RLS check at all, defeating can_view_game_session() for
-- the (still possible) private session. Reads go through signed URLs,
-- which Storage issues only when the requester's SELECT policy passes.

insert into storage.buckets (id, name, public)
values ('session-photos', 'session-photos', false)
on conflict (id) do nothing;

create policy "session_photos_select" on storage.objects
  for select using (
    bucket_id = 'session-photos'
    and public.can_view_game_session(((storage.foldername(name))[1])::uuid)
  );

create policy "session_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'session-photos'
    and owner_id = auth.uid()::text
    and public.can_view_game_session(((storage.foldername(name))[1])::uuid)
  );

create policy "session_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'session-photos'
    and (
      owner_id = auth.uid()::text
      or exists (
        select 1 from public.game_sessions
        where id = ((storage.foldername(name))[1])::uuid and created_by = auth.uid()
      )
    )
  );
