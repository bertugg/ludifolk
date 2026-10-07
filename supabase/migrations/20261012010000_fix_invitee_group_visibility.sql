-- A pending invitee couldn't read the groups row their invitation points
-- to (groups RLS only allowed members/creator), so the notification's
-- embedded group data came back null and the invite silently failed to
-- render ("Notifications" page showed nothing). You need to see what
-- you're being invited to in order to decide whether to accept it.
-- This only grants read access to the group's own row (name/description/
-- avatar) — it does NOT make them a member, so group feed/content still
-- correctly stays hidden until they actually accept.

drop policy "groups_select_members" on public.groups;

create policy "groups_select_members" on public.groups
  for select using (
    public.is_group_member(id)
    or created_by = auth.uid()
    or exists (
      select 1 from public.group_invitations
      where group_id = id and invitee_id = auth.uid() and status = 'pending'
    )
  );
