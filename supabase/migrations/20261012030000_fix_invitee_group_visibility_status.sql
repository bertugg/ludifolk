-- Restricting the invitee-visibility clause to status = 'pending' meant
-- that the moment someone declines (or after they accept, though
-- is_group_member covers that case), they immediately lose read access to
-- the group row — including the very notification row that's still on
-- screen showing them the result of declining. Any existing invitation
-- relationship (regardless of status) should be enough to read the group's
-- basic info; actual content stays gated by real membership.

drop policy "groups_select_members" on public.groups;

create policy "groups_select_members" on public.groups
  for select using (
    public.is_group_member(id)
    or created_by = auth.uid()
    or exists (
      select 1 from public.group_invitations gi
      where gi.group_id = groups.id and gi.invitee_id = auth.uid()
    )
  );
