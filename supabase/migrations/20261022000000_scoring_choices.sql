-- Non-scoring "choice" fields in a game's scoring_schema (category type
-- "choice"): what was picked rather than how much was scored — Small World's
-- races, Spirit Island's spirit, the map played. Stored apart from the numeric
-- score_breakdown / team_details so totals and stats never see them.
--
-- Shape of both columns: { "<category key>": ["<value>", ...] } — always an
-- array, even for single-choice fields.
--
-- RLS is inherited: the existing update policies on both tables already gate
-- on "you created the session" / "you're the participant".

alter table public.game_participants add column choices jsonb;
alter table public.game_sessions add column team_choices jsonb;
