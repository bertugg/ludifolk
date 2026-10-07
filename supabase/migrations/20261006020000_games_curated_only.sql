-- Game catalog is curated for now, not user-generated. Players shouldn't be
-- able to add board games directly — only service-role (admin tooling / the
-- future BGG integration layer) can insert into `games`. RLS has no insert
-- policy for `authenticated` after this, so direct inserts are denied by
-- default; reads remain public via `games_select_all`.

drop policy "games_insert_authenticated" on public.games;
