-- Detailed scoring schemas for a curated subset of the catalog, sourced
-- from a reference scoring library provided for the task. Deliberately NOT
-- the full catalog: populated only where (a) scoring_type = 'numeric', so
-- the category UI actually renders for it, (b) the real scoring is a true
-- additive sum (no multipliers/conditional brackets our flat-sum total
-- can't represent correctly — e.g. Scythe's popularity multiplier, Ark
-- Nova's appeal/conservation relationship), (c) the category set is static
-- across every session of the game, not session-variable (e.g. Concordia's
-- god cards, Terraforming Mars' card-based VP), and (d) the category names
-- are genuine rulebook/scorepad terminology, not generic filler. Everything
-- else in the reference library was intentionally left as a simple final
-- score — see the task report for the full per-game reasoning.

update public.games set scoring_schema = '[
  { "key": "military_conflicts", "label": "Military Conflicts", "scope": "player", "contributesToTotal": true },
  { "key": "civilian_structures", "label": "Civilian Structures", "scope": "player", "contributesToTotal": true },
  { "key": "commercial_structures", "label": "Commercial Structures", "scope": "player", "contributesToTotal": true },
  { "key": "guilds", "label": "Guilds", "scope": "player", "contributesToTotal": true },
  { "key": "science", "label": "Science", "scope": "player", "contributesToTotal": true },
  { "key": "wonder_stages", "label": "Wonder Stages", "scope": "player", "contributesToTotal": true },
  { "key": "coins", "label": "Coins", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = '7-wonders';

update public.games set scoring_schema = '[
  { "key": "fields", "label": "Fields", "scope": "player", "contributesToTotal": true },
  { "key": "pastures", "label": "Pastures", "scope": "player", "contributesToTotal": true },
  { "key": "grain", "label": "Grain", "scope": "player", "contributesToTotal": true },
  { "key": "vegetables", "label": "Vegetables", "scope": "player", "contributesToTotal": true },
  { "key": "sheep", "label": "Sheep", "scope": "player", "contributesToTotal": true },
  { "key": "wild_boar", "label": "Wild Boar", "scope": "player", "contributesToTotal": true },
  { "key": "cattle", "label": "Cattle", "scope": "player", "contributesToTotal": true },
  { "key": "unused_spaces", "label": "Unused Farmyard Spaces", "scope": "player", "contributesToTotal": true, "description": "Enter as negative — this is a penalty." },
  { "key": "major_improvements", "label": "Major Improvements", "scope": "player", "contributesToTotal": true },
  { "key": "minor_improvements", "label": "Minor Improvements", "scope": "player", "contributesToTotal": true },
  { "key": "occupations", "label": "Occupations", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'agricola';

update public.games set scoring_schema = '[
  { "key": "pattern_line", "label": "Pattern-Line Points", "scope": "player", "contributesToTotal": true },
  { "key": "row_bonuses", "label": "Row Bonuses", "scope": "player", "contributesToTotal": true },
  { "key": "column_bonuses", "label": "Column Bonuses", "scope": "player", "contributesToTotal": true },
  { "key": "color_set_bonuses", "label": "Color Set Bonuses", "scope": "player", "contributesToTotal": true },
  { "key": "floor_penalties", "label": "Floor-Line Penalties", "scope": "player", "contributesToTotal": true, "description": "Enter as negative." }
]'::jsonb where slug = 'azul';

update public.games set scoring_schema = '[
  { "key": "battles", "label": "Battles", "scope": "player", "contributesToTotal": true },
  { "key": "quests", "label": "Quests", "scope": "player", "contributesToTotal": true },
  { "key": "pillage", "label": "Pillage", "scope": "player", "contributesToTotal": true },
  { "key": "upgrades", "label": "Upgrades", "scope": "player", "contributesToTotal": true },
  { "key": "ragnarok", "label": "Ragnarök", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'blood-rage';

update public.games set scoring_schema = '[
  { "key": "cats", "label": "Cats", "scope": "player", "contributesToTotal": true },
  { "key": "buttons", "label": "Buttons", "scope": "player", "contributesToTotal": true },
  { "key": "design_goals", "label": "Design Goals", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'calico';

update public.games set scoring_schema = '[
  { "key": "roads", "label": "Roads", "scope": "player", "contributesToTotal": true },
  { "key": "cities", "label": "Cities", "scope": "player", "contributesToTotal": true },
  { "key": "monasteries", "label": "Monasteries", "scope": "player", "contributesToTotal": true },
  { "key": "fields", "label": "Fields", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'carcassonne';

update public.games set scoring_schema = '[
  { "key": "spring", "label": "Spring", "scope": "player", "contributesToTotal": true },
  { "key": "summer", "label": "Summer", "scope": "player", "contributesToTotal": true },
  { "key": "autumn", "label": "Autumn", "scope": "player", "contributesToTotal": true },
  { "key": "winter", "label": "Winter", "scope": "player", "contributesToTotal": true },
  { "key": "monster_penalty", "label": "Monster Penalty", "scope": "player", "contributesToTotal": true, "description": "Enter as negative." }
]'::jsonb where slug = 'cartographers';

update public.games set scoring_schema = '[
  { "key": "settlements", "label": "Settlements", "scope": "player", "contributesToTotal": true },
  { "key": "cities", "label": "Cities", "scope": "player", "contributesToTotal": true },
  { "key": "vp_dev_cards", "label": "Victory Point Development Cards", "scope": "player", "contributesToTotal": true },
  { "key": "longest_road", "label": "Longest Road", "scope": "player", "contributesToTotal": true },
  { "key": "largest_army", "label": "Largest Army", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'catan';

update public.games set scoring_schema = '[
  { "key": "dwellings", "label": "Dwellings", "scope": "player", "contributesToTotal": true },
  { "key": "pastures", "label": "Pastures", "scope": "player", "contributesToTotal": true },
  { "key": "fields", "label": "Fields", "scope": "player", "contributesToTotal": true },
  { "key": "sheep", "label": "Sheep", "scope": "player", "contributesToTotal": true },
  { "key": "wild_boar", "label": "Wild Boar", "scope": "player", "contributesToTotal": true },
  { "key": "cattle", "label": "Cattle", "scope": "player", "contributesToTotal": true },
  { "key": "grain", "label": "Grain", "scope": "player", "contributesToTotal": true },
  { "key": "vegetables", "label": "Vegetables", "scope": "player", "contributesToTotal": true },
  { "key": "rubies", "label": "Rubies", "scope": "player", "contributesToTotal": true },
  { "key": "furnishings", "label": "Furnishings", "scope": "player", "contributesToTotal": true },
  { "key": "family_members", "label": "Family Members", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'caverna-the-cave-farmers';

update public.games set scoring_schema = '[
  { "key": "victory_cards", "label": "Victory Cards", "scope": "player", "contributesToTotal": true },
  { "key": "victory_tokens", "label": "Victory Tokens", "scope": "player", "contributesToTotal": true },
  { "key": "curse_cards", "label": "Curse Cards", "scope": "player", "contributesToTotal": true, "description": "Enter as negative." }
]'::jsonb where slug = 'dominion';

update public.games set scoring_schema = '[
  { "key": "cards", "label": "Cards", "scope": "player", "contributesToTotal": true },
  { "key": "events", "label": "Events", "scope": "player", "contributesToTotal": true },
  { "key": "journey", "label": "Journey", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'everdell';

update public.games set scoring_schema = '[
  { "key": "red_expedition", "label": "Red Expedition", "scope": "player", "contributesToTotal": true },
  { "key": "white_expedition", "label": "White Expedition", "scope": "player", "contributesToTotal": true },
  { "key": "green_expedition", "label": "Green Expedition", "scope": "player", "contributesToTotal": true },
  { "key": "blue_expedition", "label": "Blue Expedition", "scope": "player", "contributesToTotal": true },
  { "key": "yellow_expedition", "label": "Yellow Expedition", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'lost-cities';

update public.games set scoring_schema = '[
  { "key": "parks_visited", "label": "Parks Visited", "scope": "player", "contributesToTotal": true },
  { "key": "wildlife", "label": "Wildlife", "scope": "player", "contributesToTotal": true },
  { "key": "photos", "label": "Photos", "scope": "player", "contributesToTotal": true },
  { "key": "year_goals", "label": "Year Goals", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'parks';

update public.games set scoring_schema = '[
  { "key": "buttons", "label": "Buttons", "scope": "player", "contributesToTotal": true },
  { "key": "empty_spaces_penalty", "label": "Empty Spaces Penalty", "scope": "player", "contributesToTotal": true, "description": "Enter as negative." },
  { "key": "finish_bonus", "label": "Finish Bonus", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'patchwork';

update public.games set scoring_schema = '[
  { "key": "carrots", "label": "Carrots", "scope": "player", "contributesToTotal": true },
  { "key": "cabbages", "label": "Cabbages", "scope": "player", "contributesToTotal": true },
  { "key": "onions", "label": "Onions", "scope": "player", "contributesToTotal": true },
  { "key": "tomatoes", "label": "Tomatoes", "scope": "player", "contributesToTotal": true },
  { "key": "peppers", "label": "Peppers", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'point-salad';

update public.games set scoring_schema = '[
  { "key": "public_objective_1", "label": "Public Objective 1", "scope": "player", "contributesToTotal": true },
  { "key": "public_objective_2", "label": "Public Objective 2", "scope": "player", "contributesToTotal": true },
  { "key": "private_objective", "label": "Private Objective", "scope": "player", "contributesToTotal": true },
  { "key": "favor_tokens", "label": "Favor Tokens", "scope": "player", "contributesToTotal": true },
  { "key": "empty_spaces_penalty", "label": "Empty Spaces Penalty", "scope": "player", "contributesToTotal": true, "description": "Enter as negative." }
]'::jsonb where slug = 'sagrada';

update public.games set scoring_schema = '[
  { "key": "development_cards", "label": "Development Cards", "scope": "player", "contributesToTotal": true },
  { "key": "nobles", "label": "Nobles", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'splendor';

update public.games set scoring_schema = '[
  { "key": "tempura", "label": "Tempura", "scope": "player", "contributesToTotal": true },
  { "key": "sashimi", "label": "Sashimi", "scope": "player", "contributesToTotal": true },
  { "key": "dumplings", "label": "Dumplings", "scope": "player", "contributesToTotal": true },
  { "key": "maki_rolls", "label": "Maki Rolls", "scope": "player", "contributesToTotal": true },
  { "key": "nigiri", "label": "Nigiri", "scope": "player", "contributesToTotal": true },
  { "key": "pudding", "label": "Pudding", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'sushi-go';

update public.games set scoring_schema = '[
  { "key": "dragons", "label": "Dragons", "scope": "player", "contributesToTotal": true },
  { "key": "caves", "label": "Caves", "scope": "player", "contributesToTotal": true },
  { "key": "eggs", "label": "Eggs", "scope": "player", "contributesToTotal": true },
  { "key": "resources", "label": "Resources", "scope": "player", "contributesToTotal": true },
  { "key": "guild_cards", "label": "Guild Cards", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'wyrmspan';

update public.games set scoring_schema = '[
  { "key": "bears", "label": "Bears", "scope": "player", "contributesToTotal": true },
  { "key": "elk", "label": "Elk", "scope": "player", "contributesToTotal": true },
  { "key": "salmon", "label": "Salmon", "scope": "player", "contributesToTotal": true },
  { "key": "hawks", "label": "Hawks", "scope": "player", "contributesToTotal": true },
  { "key": "foxes", "label": "Foxes", "scope": "player", "contributesToTotal": true },
  { "key": "habitat", "label": "Habitat", "scope": "player", "contributesToTotal": true },
  { "key": "nature_tokens", "label": "Nature Tokens", "scope": "player", "contributesToTotal": true }
]'::jsonb where slug = 'cascadia';

-- Team-scope (cooperative "Game Details" / informational, do not
-- contribute to any total — cooperative games have no numeric total).

update public.games set scoring_schema = '[
  { "key": "terror_level", "label": "Terror Level", "scope": "team", "contributesToTotal": false },
  { "key": "dahan_remaining", "label": "Dahan Remaining", "scope": "team", "contributesToTotal": false },
  { "key": "blight", "label": "Blight", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'spirit-island';

update public.games set scoring_schema = '[
  { "key": "treasures_recovered", "label": "Treasures Recovered", "scope": "team", "contributesToTotal": false },
  { "key": "water_level", "label": "Water Level", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'forbidden-island';

update public.games set scoring_schema = '[
  { "key": "water_remaining", "label": "Water Remaining", "scope": "team", "contributesToTotal": false },
  { "key": "storm_level", "label": "Storm Level", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'forbidden-desert';

update public.games set scoring_schema = '[
  { "key": "fuses_remaining", "label": "Fuses Remaining", "scope": "team", "contributesToTotal": false },
  { "key": "hints_remaining", "label": "Hints Remaining", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'hanabi';

update public.games set scoring_schema = '[
  { "key": "correct_answers", "label": "Correct Answers", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'just-one';

update public.games set scoring_schema = '[
  { "key": "mission_number", "label": "Mission Number", "scope": "team", "contributesToTotal": false, "description": "Furthest mission reached in the campaign." }
]'::jsonb where slug = 'the-crew-the-quest-for-planet-nine';

update public.games set scoring_schema = '[
  { "key": "correct_guesses", "label": "Correct Guesses", "scope": "team", "contributesToTotal": false },
  { "key": "turns_taken", "label": "Turns Taken", "scope": "team", "contributesToTotal": false }
]'::jsonb where slug = 'codenames';
