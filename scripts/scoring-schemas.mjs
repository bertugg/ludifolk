// Scoring schemas (per-category score entry) for the curated catalog, keyed
// by game slug. Source of truth for scripts/seed-games.mjs, which writes
// scoring_schema on every upsert — so a fresh database gets them from seeding
// alone, regardless of migration order. A game missing here is seeded with
// no schema (plain total-score entry).
//
// To add or change a schema: edit this file and re-run the seed against each
// environment (npm run seed:games). Provenance notes for the original
// schemas live in supabase/migrations/2026101{6,7,8}*.sql.
//
// Shape: see ScoringCategory in src/lib/scoring.ts.

export const SCORING_SCHEMAS = {
  "7-wonders": [
    { "contributesToTotal": true, "key": "military_conflicts", "label": "Military Conflicts", "scope": "player" },
    { "contributesToTotal": true, "key": "civilian_structures", "label": "Civilian Structures", "scope": "player" },
    { "contributesToTotal": true, "key": "commercial_structures", "label": "Commercial Structures", "scope": "player" },
    { "contributesToTotal": true, "key": "guilds", "label": "Guilds", "scope": "player" },
    { "contributesToTotal": true, "key": "science", "label": "Science", "scope": "player" },
    { "contributesToTotal": true, "key": "wonder_stages", "label": "Wonder Stages", "scope": "player" },
    { "contributesToTotal": true, "key": "coins", "label": "Coins", "scope": "player" },
  ],
  agricola: [
    { "contributesToTotal": true, "key": "fields", "label": "Fields", "scope": "player" },
    { "contributesToTotal": true, "key": "pastures", "label": "Pastures", "scope": "player" },
    { "contributesToTotal": true, "key": "grain", "label": "Grain", "scope": "player" },
    { "contributesToTotal": true, "key": "vegetables", "label": "Vegetables", "scope": "player" },
    { "contributesToTotal": true, "key": "sheep", "label": "Sheep", "scope": "player" },
    { "contributesToTotal": true, "key": "wild_boar", "label": "Wild Boar", "scope": "player" },
    { "contributesToTotal": true, "key": "cattle", "label": "Cattle", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative — this is a penalty.", "key": "unused_spaces", "label": "Unused Farmyard Spaces", "scope": "player" },
    { "contributesToTotal": true, "key": "major_improvements", "label": "Major Improvements", "scope": "player" },
    { "contributesToTotal": true, "key": "minor_improvements", "label": "Minor Improvements", "scope": "player" },
    { "contributesToTotal": true, "key": "occupations", "label": "Occupations", "scope": "player" },
  ],
  azul: [
    { "contributesToTotal": true, "key": "pattern_line", "label": "Pattern-Line Points", "scope": "player" },
    { "contributesToTotal": true, "key": "row_bonuses", "label": "Row Bonuses", "scope": "player" },
    { "contributesToTotal": true, "key": "column_bonuses", "label": "Column Bonuses", "scope": "player" },
    { "contributesToTotal": true, "key": "color_set_bonuses", "label": "Color Set Bonuses", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative.", "key": "floor_penalties", "label": "Floor-Line Penalties", "scope": "player" },
  ],
  "blood-rage": [
    { "contributesToTotal": true, "key": "battles", "label": "Battles", "scope": "player" },
    { "contributesToTotal": true, "key": "quests", "label": "Quests", "scope": "player" },
    { "contributesToTotal": true, "key": "pillage", "label": "Pillage", "scope": "player" },
    { "contributesToTotal": true, "key": "upgrades", "label": "Upgrades", "scope": "player" },
    { "contributesToTotal": true, "key": "ragnarok", "label": "Ragnarök", "scope": "player" },
  ],
  calico: [
    { "contributesToTotal": true, "key": "cats", "label": "Cats", "scope": "player" },
    { "contributesToTotal": true, "key": "buttons", "label": "Buttons", "scope": "player" },
    { "contributesToTotal": true, "key": "design_goals", "label": "Design Goals", "scope": "player" },
  ],
  carcassonne: [
    { "contributesToTotal": true, "key": "roads", "label": "Roads", "scope": "player" },
    { "contributesToTotal": true, "key": "cities", "label": "Cities", "scope": "player" },
    { "contributesToTotal": true, "key": "monasteries", "label": "Monasteries", "scope": "player" },
    { "contributesToTotal": true, "key": "fields", "label": "Fields", "scope": "player" },
  ],
  cartographers: [
    { "contributesToTotal": true, "key": "spring", "label": "Spring", "scope": "player" },
    { "contributesToTotal": true, "key": "summer", "label": "Summer", "scope": "player" },
    { "contributesToTotal": true, "key": "autumn", "label": "Autumn", "scope": "player" },
    { "contributesToTotal": true, "key": "winter", "label": "Winter", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative.", "key": "monster_penalty", "label": "Monster Penalty", "scope": "player" },
  ],
  cascadia: [
    { "contributesToTotal": true, "key": "bears", "label": "Bears", "scope": "player" },
    { "contributesToTotal": true, "key": "elk", "label": "Elk", "scope": "player" },
    { "contributesToTotal": true, "key": "salmon", "label": "Salmon", "scope": "player" },
    { "contributesToTotal": true, "key": "hawks", "label": "Hawks", "scope": "player" },
    { "contributesToTotal": true, "key": "foxes", "label": "Foxes", "scope": "player" },
    { "contributesToTotal": true, "key": "habitat", "label": "Habitat", "scope": "player" },
    { "contributesToTotal": true, "key": "nature_tokens", "label": "Nature Tokens", "scope": "player" },
  ],
  catan: [
    { "contributesToTotal": true, "key": "settlements", "label": "Settlements", "scope": "player" },
    { "contributesToTotal": true, "key": "cities", "label": "Cities", "scope": "player" },
    { "contributesToTotal": true, "key": "vp_dev_cards", "label": "Victory Point Development Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "longest_road", "label": "Longest Road", "scope": "player" },
    { "contributesToTotal": true, "key": "largest_army", "label": "Largest Army", "scope": "player" },
  ],
  "caverna-the-cave-farmers": [
    { "contributesToTotal": true, "key": "dwellings", "label": "Dwellings", "scope": "player" },
    { "contributesToTotal": true, "key": "pastures", "label": "Pastures", "scope": "player" },
    { "contributesToTotal": true, "key": "fields", "label": "Fields", "scope": "player" },
    { "contributesToTotal": true, "key": "sheep", "label": "Sheep", "scope": "player" },
    { "contributesToTotal": true, "key": "wild_boar", "label": "Wild Boar", "scope": "player" },
    { "contributesToTotal": true, "key": "cattle", "label": "Cattle", "scope": "player" },
    { "contributesToTotal": true, "key": "grain", "label": "Grain", "scope": "player" },
    { "contributesToTotal": true, "key": "vegetables", "label": "Vegetables", "scope": "player" },
    { "contributesToTotal": true, "key": "rubies", "label": "Rubies", "scope": "player" },
    { "contributesToTotal": true, "key": "furnishings", "label": "Furnishings", "scope": "player" },
    { "contributesToTotal": true, "key": "family_members", "label": "Family Members", "scope": "player" },
  ],
  codenames: [
    { "contributesToTotal": false, "key": "correct_guesses", "label": "Correct Guesses", "scope": "team" },
    { "contributesToTotal": false, "key": "turns_taken", "label": "Turns Taken", "scope": "team" },
  ],
  dominion: [
    { "contributesToTotal": true, "key": "victory_cards", "label": "Victory Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "victory_tokens", "label": "Victory Tokens", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative.", "key": "curse_cards", "label": "Curse Cards", "scope": "player" },
  ],
  everdell: [
    { "contributesToTotal": true, "key": "cards", "label": "Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "events", "label": "Events", "scope": "player" },
    { "contributesToTotal": true, "key": "journey", "label": "Journey", "scope": "player" },
  ],
  "forbidden-desert": [
    { "contributesToTotal": false, "key": "water_remaining", "label": "Water Remaining", "scope": "team" },
    { "contributesToTotal": false, "key": "storm_level", "label": "Storm Level", "scope": "team" },
  ],
  "forbidden-island": [
    { "contributesToTotal": false, "key": "treasures_recovered", "label": "Treasures Recovered", "scope": "team" },
    { "contributesToTotal": false, "key": "water_level", "label": "Water Level", "scope": "team" },
  ],
  hanabi: [
    { "contributesToTotal": false, "key": "fuses_remaining", "label": "Fuses Remaining", "scope": "team" },
    { "contributesToTotal": false, "key": "hints_remaining", "label": "Hints Remaining", "scope": "team" },
  ],
  "just-one": [
    { "contributesToTotal": false, "key": "correct_answers", "label": "Correct Answers", "scope": "team" },
  ],
  "lost-cities": [
    { "contributesToTotal": true, "key": "red_expedition", "label": "Red Expedition", "scope": "player" },
    { "contributesToTotal": true, "key": "white_expedition", "label": "White Expedition", "scope": "player" },
    { "contributesToTotal": true, "key": "green_expedition", "label": "Green Expedition", "scope": "player" },
    { "contributesToTotal": true, "key": "blue_expedition", "label": "Blue Expedition", "scope": "player" },
    { "contributesToTotal": true, "key": "yellow_expedition", "label": "Yellow Expedition", "scope": "player" },
  ],
  pandemic: [
    { "contributesToTotal": false, "description": "Number of Epidemic cards used — sets the difficulty.", "key": "epidemic_cards", "label": "Epidemic Cards", "scope": "team" },
    { "contributesToTotal": false, "key": "outbreaks", "label": "Outbreaks", "scope": "team" },
  ],
  parks: [
    { "contributesToTotal": true, "key": "parks_visited", "label": "Parks Visited", "scope": "player" },
    { "contributesToTotal": true, "key": "wildlife", "label": "Wildlife", "scope": "player" },
    { "contributesToTotal": true, "key": "photos", "label": "Photos", "scope": "player" },
    { "contributesToTotal": true, "key": "year_goals", "label": "Year Goals", "scope": "player" },
  ],
  patchwork: [
    { "contributesToTotal": true, "key": "buttons", "label": "Buttons", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative.", "key": "empty_spaces_penalty", "label": "Empty Spaces Penalty", "scope": "player" },
    { "contributesToTotal": true, "key": "finish_bonus", "label": "Finish Bonus", "scope": "player" },
  ],
  "point-salad": [
    { "contributesToTotal": true, "key": "carrots", "label": "Carrots", "scope": "player" },
    { "contributesToTotal": true, "key": "cabbages", "label": "Cabbages", "scope": "player" },
    { "contributesToTotal": true, "key": "onions", "label": "Onions", "scope": "player" },
    { "contributesToTotal": true, "key": "tomatoes", "label": "Tomatoes", "scope": "player" },
    { "contributesToTotal": true, "key": "peppers", "label": "Peppers", "scope": "player" },
  ],
  "puerto-rico": [
    { "contributesToTotal": true, "key": "shipped_goods", "label": "Shipped Goods", "scope": "player" },
    { "contributesToTotal": true, "key": "buildings", "label": "Buildings", "scope": "player" },
    { "contributesToTotal": true, "key": "large_building_bonus", "label": "Large Building Bonus", "scope": "player" },
  ],
  sagrada: [
    { "contributesToTotal": true, "key": "public_objective_1", "label": "Public Objective 1", "scope": "player" },
    { "contributesToTotal": true, "key": "public_objective_2", "label": "Public Objective 2", "scope": "player" },
    { "contributesToTotal": true, "key": "private_objective", "label": "Private Objective", "scope": "player" },
    { "contributesToTotal": true, "key": "favor_tokens", "label": "Favor Tokens", "scope": "player" },
    { "contributesToTotal": true, "description": "Enter as negative.", "key": "empty_spaces_penalty", "label": "Empty Spaces Penalty", "scope": "player" },
  ],
  "spirit-island": [
    { "contributesToTotal": false, "key": "terror_level", "label": "Terror Level", "scope": "team" },
    { "contributesToTotal": false, "key": "dahan_remaining", "label": "Dahan Remaining", "scope": "team" },
    { "contributesToTotal": false, "key": "blight", "label": "Blight", "scope": "team" },
  ],
  splendor: [
    { "contributesToTotal": true, "key": "development_cards", "label": "Development Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "nobles", "label": "Nobles", "scope": "player" },
  ],
  "sushi-go": [
    { "contributesToTotal": true, "key": "tempura", "label": "Tempura", "scope": "player" },
    { "contributesToTotal": true, "key": "sashimi", "label": "Sashimi", "scope": "player" },
    { "contributesToTotal": true, "key": "dumplings", "label": "Dumplings", "scope": "player" },
    { "contributesToTotal": true, "key": "maki_rolls", "label": "Maki Rolls", "scope": "player" },
    { "contributesToTotal": true, "key": "nigiri", "label": "Nigiri", "scope": "player" },
    { "contributesToTotal": true, "key": "pudding", "label": "Pudding", "scope": "player" },
  ],
  "terra-mystica": [
    { "contributesToTotal": false, "description": "End-game cult track bonus — supplementary detail, not the full score.", "key": "cult_scoring", "label": "Cult Scoring", "scope": "player" },
    { "contributesToTotal": false, "description": "End-game largest-connected-area bonus — supplementary detail, not the full score.", "key": "area_scoring", "label": "Area Scoring", "scope": "player" },
    { "contributesToTotal": false, "description": "Leftover resources converted to coins — supplementary detail, not the full score.", "key": "resource_scoring", "label": "Resource Scoring", "scope": "player" },
  ],
  "the-crew-the-quest-for-planet-nine": [
    { "contributesToTotal": false, "description": "Furthest mission reached in the campaign.", "key": "mission_number", "label": "Mission Number", "scope": "team" },
  ],
  wingspan: [
    { "contributesToTotal": true, "key": "birds", "label": "Birds", "scope": "player" },
    { "contributesToTotal": true, "key": "bonus_cards", "label": "Bonus Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "end_of_round_goals", "label": "End-of-Round Goals", "scope": "player" },
    { "contributesToTotal": true, "key": "eggs", "label": "Eggs", "scope": "player" },
    { "contributesToTotal": true, "key": "food_on_cards", "label": "Food on Cards", "scope": "player" },
    { "contributesToTotal": true, "key": "tucked_cards", "label": "Tucked Cards", "scope": "player" },
  ],
  wyrmspan: [
    { "contributesToTotal": true, "key": "dragons", "label": "Dragons", "scope": "player" },
    { "contributesToTotal": true, "key": "caves", "label": "Caves", "scope": "player" },
    { "contributesToTotal": true, "key": "eggs", "label": "Eggs", "scope": "player" },
    { "contributesToTotal": true, "key": "resources", "label": "Resources", "scope": "player" },
    { "contributesToTotal": true, "key": "guild_cards", "label": "Guild Cards", "scope": "player" },
  ],
};
