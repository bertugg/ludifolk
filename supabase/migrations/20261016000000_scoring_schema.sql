-- Game-specific detailed scoring. A game can optionally define a scoring
-- schema (an ordered list of categories); when it does, player results can
-- store a breakdown by category, not just a final number.
--
-- Deliberately JSONB, not one column per category (which would mean
-- hundreds of columns across hundreds of games and a migration every time
-- a new game's schema is added) and deliberately NOT a new table (no
-- category identity/relationships are needed beyond "this game has this
-- list of categories" — a small ordered array on the game row already
-- models that, and keeps reads to the one query that already fetches the
-- game). RLS is inherited for free: `games` already has no update policy
-- for regular users (curated-catalog only, see games_curated_only.sql), so
-- only admin tooling can ever define a scoring_schema — regular users can
-- never invent categories through the app, by construction. The two value
-- columns inherit the existing update policies on their tables, which
-- already gate on "you're the participant" / "you created the session".
--
-- Shape of games.scoring_schema (array, order = display order):
--   [{ "key": "birds", "label": "Birds", "scope": "player",
--      "contributesToTotal": true, "description"?: string }, ...]
-- scope is "player" (per-participant, stored in game_participants.
-- score_breakdown) or "team" (shared by the whole session, stored in
-- game_sessions.team_details — e.g. a cooperative game's difficulty).
--
-- Shape of score_breakdown / team_details: { "<category key>": number }.
-- A missing key means "not entered", not zero — never inferred.

alter table public.games add column scoring_schema jsonb;
alter table public.game_participants add column score_breakdown jsonb;
alter table public.game_sessions add column team_details jsonb;

-- Wingspan: real, standard base-game scoring categories (not invented) —
-- the primary test case called out in the brief. All contribute to the
-- final score, which is their sum.
update public.games
set scoring_schema = '[
  { "key": "birds", "label": "Birds", "scope": "player", "contributesToTotal": true },
  { "key": "bonus_cards", "label": "Bonus Cards", "scope": "player", "contributesToTotal": true },
  { "key": "end_of_round_goals", "label": "End-of-Round Goals", "scope": "player", "contributesToTotal": true },
  { "key": "eggs", "label": "Eggs", "scope": "player", "contributesToTotal": true },
  { "key": "food_on_cards", "label": "Food on Cards", "scope": "player", "contributesToTotal": true },
  { "key": "tucked_cards", "label": "Tucked Cards", "scope": "player", "contributesToTotal": true }
]'::jsonb
where slug = 'wingspan';

-- Pandemic: a cooperative test case. These are real session-level facts
-- (epidemic card count selects the difficulty level; the outbreak track
-- runs 0-8 and ends the game at 8) — informational, not scoring, so
-- neither contributes to a total (cooperative games have no numeric total).
update public.games
set scoring_schema = '[
  { "key": "epidemic_cards", "label": "Epidemic Cards", "scope": "team", "contributesToTotal": false, "description": "Number of Epidemic cards used — sets the difficulty." },
  { "key": "outbreaks", "label": "Outbreaks", "scope": "team", "contributesToTotal": false }
]'::jsonb
where slug = 'pandemic';
