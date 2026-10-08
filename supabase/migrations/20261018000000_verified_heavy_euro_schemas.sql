-- Follow-up to 20261017000000_more_scoring_schemas.sql: verifies a batch
-- of heavier Euro games that were previously skipped for low confidence,
-- against real rulebooks/scoring references.
--
-- Verdicts from that research:
--   - Puerto Rico: real end-game total is a clean, complete additive sum
--     (VP chips from shipped goods + printed building VP + occupied
--     large-building bonus) — confirmed, included as a normal total.
--   - Terra Mystica: Cult/Area/Resource scoring are real, distinct,
--     officially named end-game categories, but they are only the FINAL
--     scoring step — the bulk of a Terra Mystica score comes from
--     round-by-round scoring-tile VP accumulated during play, which isn't
--     separable after the fact. Including these three as an auto-summed
--     "total" would be wrong (it would omit most of the real score), so
--     they're added as optional supplementary detail only
--     (contributesToTotal: false) — the player still enters their real
--     final score; these are just extra flavor categories, same pattern
--     already used for Pandemic's team details.
--   - Brass: Birmingham — scoring happens incrementally at the end of each
--     era as a running VP-track total; there's no clean single breakdown a
--     player could reconstruct after the fact. Left simple.
--   - Great Western Trail — real scoring pad has ~9-12 rows, but the exact
--     set differs between 1st edition ("Teepees") and 2nd edition
--     ("Hazards"), and other items were inconsistent across sources. Not
--     confident enough to guarantee a complete, edition-correct category
--     list. Left simple.
--   - Viticulture — VP accumulates turn-by-turn via many small triggers
--     (wine orders, visitor cards, structure bonuses) with no official
--     end-game category breakdown to log after the fact. Left simple.
--   - The Castles of Burgundy — sources were incomplete/possibly conflated
--     with a different edition of the game. Not confident. Left simple.

update public.games set scoring_schema = '[
  { "key": "shipped_goods", "label": "Shipped Goods", "scope": "player", "contributesToTotal": true },
  { "key": "buildings", "label": "Buildings", "scope": "player", "contributesToTotal": true },
  { "key": "large_building_bonus", "label": "Large Building Bonus", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'puerto-rico';

update public.games set scoring_schema = '[
  { "key": "cult_scoring", "label": "Cult Scoring", "scope": "player", "contributesToTotal": false, "description": "End-game cult track bonus — supplementary detail, not the full score." },
  { "key": "area_scoring", "label": "Area Scoring", "scope": "player", "contributesToTotal": false, "description": "End-game largest-connected-area bonus — supplementary detail, not the full score." },
  { "key": "resource_scoring", "label": "Resource Scoring", "scope": "player", "contributesToTotal": false, "description": "Leftover resources converted to coins — supplementary detail, not the full score." }
]'::jsonb where slug = 'terra-mystica';
