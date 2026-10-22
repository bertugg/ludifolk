-- Retire a game from the catalog without deleting it. Games referenced by
-- logged sessions can't be deleted (game_sessions.game_id is ON DELETE
-- RESTRICT, protecting players' history), so hiding is the way to stop a
-- game appearing in search, browse and the log picker while its sessions,
-- stats and detail page keep working.
--
-- Set by admin tooling only (data/games.csv `hidden`, written by
-- scripts/seed-games.mjs) — `games` has no update policy for regular users.

alter table public.games add column is_hidden boolean not null default false;
