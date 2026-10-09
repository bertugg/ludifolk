-- Session photos now upload straight from the browser to Storage (the
-- logGame server action used to proxy them, but host body-size caps made
-- that fail). The action also enforced the per-photo size and per-session
-- count limits, so those move into the database. Keep in sync with
-- src/lib/photo-limits.ts (MAX_SESSION_PHOTO_BYTES, MAX_SESSION_PHOTOS).

update storage.buckets
set file_size_limit = 10485760
where id = 'session-photos';

drop policy "photos_insert_self" on public.photos;

create policy "photos_insert_self" on public.photos
  for insert with check (
    uploaded_by = auth.uid()
    and public.can_view_game_session(game_session_id)
    and (select count(*) from public.photos p where p.game_session_id = photos.game_session_id) < 3
  );
