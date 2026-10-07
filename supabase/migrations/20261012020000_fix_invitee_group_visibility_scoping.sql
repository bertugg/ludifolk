-- The previous migration's EXISTS subquery had an unqualified `id` that
-- Postgres resolved to group_invitations.id (its own primary key) instead
-- of the outer groups.id, since group_invitations also has an `id` column
-- and the subquery's FROM clause is the closer scope. That made the clause
-- compare a row's own group_id to its own id — never true — so the
-- previous fix was a complete no-op. Explicitly alias the outer table.

drop policy "groups_select_members" on public.groups;

create policy "groups_select_members" on public.groups
  for select using (
    public.is_group_member(id)
    or created_by = auth.uid()
    or exists (
      select 1 from public.group_invitations gi
      where gi.group_id = groups.id and gi.invitee_id = auth.uid() and gi.status = 'pending'
    )
  );
