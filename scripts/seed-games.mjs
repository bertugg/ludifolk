// One-off/admin tool — not part of the app bundle. Seeds the `games`
// catalog with hand-curated data for ~100 widely-recognized hobby board
// games plus ~20 more recent/trending titles, compiled from general
// knowledge (no live BGG access — see scripts/import-games.mjs for the
// BGG-API-driven version, currently blocked by Cloudflare bot protection).
//
// Usage: node --env-file=.env.local scripts/seed-games.mjs
//
// image_url is intentionally left null for every row: BGG's cover-image
// URLs are opaque hashed CDN paths that can't be reliably recalled from
// memory, and a fabricated-but-plausible URL would just be a broken image
// (or worse, silently load someone else's picture). Backfill images by
// re-running scripts/import-games.mjs once BGG access works, or by hand.
//
// Upserts on slug, so re-running is safe and idempotent — it will also
// enrich any existing row (by slug) with fresher data.

import { createClient } from "@supabase/supabase-js";
import { SCORING_SCHEMAS } from "./scoring-schemas.mjs";

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// [title, year, minPlayers, maxPlayers, minPlaytime, maxPlaytime, categories, mechanics, scoringType, publisher, description]
const GAMES = [
  ["Catan", 1995, 3, 4, 60, 120, ["Negotiation", "Economic"], ["Dice Rolling", "Trading"], "numeric", "KOSMOS", "Trade resources and build settlements on the island of Catan."],
  ["Carcassonne", 2000, 2, 5, 30, 45, ["Medieval", "Territory Building"], ["Tile Placement", "Area Control"], "numeric", "Hans im Glück", "Build the medieval countryside one tile at a time."],
  ["Ticket to Ride", 2004, 2, 5, 30, 60, ["Trains", "Family"], ["Set Collection", "Route Building"], "position", "Days of Wonder", "Claim railway routes across the map before your rivals do."],
  ["Pandemic", 2008, 2, 4, 45, 45, ["Medical", "Strategy"], ["Cooperative Game", "Hand Management"], "cooperative", "Z-Man Games", "Work together to stop four diseases from overwhelming the world."],
  ["Codenames", 2015, 2, 8, 15, 15, ["Party", "Word Game"], ["Team-Based Game"], "winner_only", "Czech Games Edition", "Give one-word clues to help your team find their agents first."],
  ["Splendor", 2014, 2, 4, 30, 30, ["Renaissance", "Economic"], ["Set Collection", "Engine Building"], "numeric", "Space Cowboys", "Collect gems and build a jewel-trading empire."],
  ["Azul", 2017, 2, 4, 30, 45, ["Abstract Strategy"], ["Tile Placement", "Pattern Building"], "numeric", "Plan B Games", "Draft colorful tiles to decorate a royal palace wall."],
  ["7 Wonders", 2010, 2, 7, 30, 30, ["Ancient", "Card Game"], ["Drafting", "Set Collection"], "numeric", "Repos Production", "Draft cards to develop an ancient civilization's wonder."],
  ["Dominion", 2008, 2, 4, 30, 30, ["Card Game", "Medieval"], ["Deck Building"], "numeric", "Rio Grande Games", "The original deck-building game of growing a kingdom."],
  ["Love Letter", 2012, 2, 4, 20, 20, ["Card Game", "Deduction"], ["Hand Management", "Elimination"], "winner_only", "Z-Man Games", "A minimalist bluffing game of deduction and risk."],
  ["King of Tokyo", 2011, 2, 6, 30, 30, ["Dice", "Fighting"], ["Dice Rolling", "Push Your Luck"], "numeric", "IELLO", "Roll dice as a giant monster battling for control of Tokyo."],
  ["Dixit", 2008, 3, 6, 30, 30, ["Party", "Card Game"], ["Storytelling"], "numeric", "Libellud", "Give an evocative clue for your dreamlike card without giving too much away."],
  ["Coup", 2012, 2, 6, 15, 15, ["Bluffing", "Card Game"], ["Deduction", "Elimination"], "winner_only", "Indie Boards & Cards", "Bluff your way to being the last player standing."],
  ["Sushi Go!", 2013, 2, 5, 15, 15, ["Card Game", "Family"], ["Drafting", "Set Collection"], "numeric", "Gamewright", "Pass and pick cards to build the best sushi combo."],
  ["Patchwork", 2014, 2, 2, 15, 30, ["Puzzle", "Abstract Strategy"], ["Tile Placement"], "numeric", "Lookout Games", "A two-player patchwork quilt-building puzzle."],
  ["Kingdomino", 2016, 2, 4, 15, 20, ["Family", "Territory Building"], ["Tile Placement", "Drafting"], "numeric", "Blue Orange", "Draft domino tiles to build the best little kingdom."],
  ["Sagrada", 2017, 1, 4, 30, 45, ["Puzzle", "Dice"], ["Dice Rolling", "Drafting"], "numeric", "Floodgate Games", "Draft dice to build a stained-glass window."],
  ["Camel Up", 2014, 2, 8, 30, 45, ["Animals", "Betting"], ["Betting / Wagering", "Push Your Luck"], "winner_only", "Pegasus Spiele", "Bet on camels racing (and stacking on top of each other) around the track."],
  ["Forbidden Island", 2010, 2, 4, 30, 30, ["Adventure"], ["Cooperative Game", "Action Points"], "cooperative", "Gamewright", "Recover four treasures before a sinking island claims you."],
  ["Forbidden Desert", 2013, 2, 5, 45, 45, ["Adventure", "Survival"], ["Cooperative Game", "Hand Management"], "cooperative", "Gamewright", "Find a buried flying machine before a sandstorm buries your team."],
  ["Hanabi", 2010, 2, 5, 25, 25, ["Card Game"], ["Cooperative Game", "Hand Management"], "cooperative", "R&R Games", "Build a firework show together — without looking at your own hand."],
  ["Jaipur", 2009, 2, 2, 30, 30, ["Card Game", "Ancient"], ["Hand Management", "Set Collection"], "numeric", "Space Cowboys", "A fast two-player trading duel in the markets of Jaipur."],
  ["Lost Cities", 1999, 2, 2, 30, 30, ["Card Game", "Travel"], ["Hand Management"], "numeric", "KOSMOS", "A two-player card game of mounting risky expeditions."],
  ["Bohnanza", 1997, 2, 7, 45, 45, ["Card Game", "Farming"], ["Hand Management", "Trading"], "numeric", "Rio Grande Games", "Negotiate bean trades to grow the most profitable harvest."],
  ["Exploding Kittens", 2015, 2, 5, 15, 15, ["Card Game", "Party"], ["Hand Management", "Take That"], "winner_only", "Exploding Kittens Inc.", "Avoid drawing the exploding kitten in this fast card game."],
  ["Just One", 2018, 3, 7, 20, 20, ["Party", "Word Game"], ["Cooperative Game"], "cooperative", "Repos Production", "Give one-word clues as a team — but duplicates get erased."],
  ["The Crew: The Quest for Planet Nine", 2019, 2, 5, 20, 20, ["Card Game", "Sci-Fi"], ["Cooperative Game", "Trick-taking"], "cooperative", "KOSMOS", "A cooperative trick-taking game across a campaign of space missions."],
  ["Wavelength", 2019, 2, 12, 45, 45, ["Party"], ["Team-Based Game"], "numeric", "Palm Court Press", "Guess where your teammate's thought lands on a hidden spectrum."],
  ["Mysterium", 2015, 2, 7, 42, 42, ["Horror", "Deduction"], ["Cooperative Game", "Storytelling"], "cooperative", "Libellud", "A ghost communicates through surreal visions to solve its own murder."],
  ["Betrayal at House on the Hill", 2004, 3, 6, 60, 60, ["Horror", "Adventure"], ["Tile Placement", "Variable Player Powers"], "winner_only", "Avalon Hill", "Explore a haunted house that turns on you partway through."],
  ["Scrabble", 1948, 2, 4, 60, 90, ["Word Game"], ["Pattern Building"], "numeric", "Hasbro", "The classic crossword tile game."],
  ["Monopoly", 1935, 2, 8, 60, 180, ["Economic", "Family"], ["Roll-and-Move"], "numeric", "Hasbro", "Buy, trade, and bankrupt your way around the board."],
  ["Risk", 1957, 2, 6, 120, 120, ["Wargame", "Territory Building"], ["Area Control", "Dice Rolling"], "winner_only", "Hasbro", "Conquer the world's territories through dice-rolling combat."],
  ["Clue", 1949, 3, 6, 45, 45, ["Deduction", "Murder/Mystery"], ["Deduction"], "winner_only", "Hasbro", "Deduce the murderer, weapon, and room before anyone else."],
  ["Chess", 1475, 2, 2, 30, 60, ["Abstract Strategy"], ["Pattern Building"], "winner_only", "Public Domain", "The classic game of strategy and checkmate."],
  ["Terraforming Mars", 2016, 1, 5, 120, 120, ["Sci-Fi", "Economic"], ["Engine Building", "Tile Placement"], "numeric", "FryxGames", "Compete to terraform Mars into a habitable planet."],
  ["Gloomhaven", 2017, 1, 4, 60, 120, ["Adventure", "Fantasy"], ["Cooperative Game", "Hand Management"], "cooperative", "Cephalofair Games", "A sprawling campaign of tactical dungeon-crawling combat."],
  ["Spirit Island", 2017, 1, 4, 90, 120, ["Fantasy", "Territory Building"], ["Cooperative Game", "Area Control"], "cooperative", "Greater Than Games", "Play as island spirits defending your home from colonizing invaders."],
  ["Scythe", 2016, 1, 5, 90, 115, ["Economic", "Wargame"], ["Area Control", "Variable Player Powers"], "numeric", "Stonemaier Games", "An alternate-history engine-building game of competing factions."],
  ["Root", 2018, 2, 4, 60, 90, ["Animals", "Wargame"], ["Area Control", "Asymmetric"], "numeric", "Leder Games", "Woodland factions fight for control, each playing by different rules."],
  ["Brass: Birmingham", 2018, 2, 4, 60, 120, ["Economic", "Industrial"], ["Network Building", "Hand Management"], "numeric", "Roxley", "Build industries and canals across the Industrial Revolution."],
  ["Agricola", 2007, 1, 5, 90, 150, ["Farming", "Economic"], ["Worker Placement"], "numeric", "Lookout Games", "Grow crops, raise animals, and feed your farming family."],
  ["Puerto Rico", 2002, 2, 5, 90, 150, ["Economic", "Colonial"], ["Role Selection"], "numeric", "Rio Grande Games", "Manage plantations and shipping in colonial Puerto Rico."],
  ["Power Grid", 2004, 2, 6, 120, 120, ["Economic", "Industrial"], ["Auction/Bidding", "Network Building"], "numeric", "Rio Grande Games", "Buy power plants and fuel to electrify the most cities."],
  ["El Grande", 1995, 2, 5, 90, 120, ["Territory Building", "Medieval"], ["Area Control", "Action Points"], "numeric", "Rio Grande Games", "Deploy caballeros to dominate the regions of medieval Spain."],
  ["Twilight Struggle", 2005, 2, 2, 120, 180, ["Wargame", "Political"], ["Card Driven", "Area Control"], "numeric", "GMT Games", "Relive the Cold War as the US or USSR vying for global influence."],
  ["Through the Ages: A New Story of Civilization", 2015, 2, 4, 180, 180, ["Civilization", "Economic"], ["Engine Building", "Auction/Bidding"], "numeric", "Czech Games Edition", "Guide a civilization from antiquity to the modern age."],
  ["Great Western Trail", 2016, 2, 4, 150, 200, ["Economic", "Animals"], ["Route Building", "Engine Building"], "numeric", "eggertspiele", "Drive cattle from Texas to Kansas City, building up your herd."],
  ["Concordia", 2013, 2, 5, 100, 120, ["Civilization", "Economic"], ["Hand Management", "Route Building"], "numeric", "PD-Verlag", "Expand trade routes across the Roman Empire."],
  ["Viticulture", 2013, 1, 6, 90, 90, ["Farming", "Economic"], ["Worker Placement"], "numeric", "Stonemaier Games", "Run a vineyard through the seasons, from planting to bottling."],
  ["Res Arcana", 2019, 2, 4, 30, 60, ["Fantasy", "Card Game"], ["Engine Building", "Set Collection"], "numeric", "Sand Castle Games", "Gather magical artifacts and arcane power."],
  ["Blood Rage", 2015, 2, 4, 60, 90, ["Fighting", "Mythology"], ["Area Control", "Drafting"], "numeric", "CMON", "Viking clans fight for glory before an inevitable Ragnarök."],
  ["Everdell", 2018, 1, 4, 40, 80, ["Fantasy", "Animals"], ["Worker Placement", "Tableau Building"], "numeric", "Starling Games", "Build a woodland city of critters across the four seasons."],
  ["Cascadia", 2021, 1, 4, 30, 45, ["Animals", "Territory Building"], ["Tile Placement", "Pattern Building"], "numeric", "Flatout Games", "Build a thriving Pacific Northwest habitat for wildlife."],
  ["Lost Ruins of Arnak", 2020, 1, 4, 30, 120, ["Adventure", "Exploration"], ["Deck Building", "Worker Placement"], "numeric", "Czech Games Edition", "Explore a mysterious island to uncover its ancient secrets."],
  ["Wingspan", 2019, 1, 5, 40, 70, ["Animals", "Card Game"], ["Engine Building", "Set Collection"], "numeric", "Stonemaier Games", "Attract a beautiful and diverse collection of birds to your wildlife preserve."],
  ["Mansions of Madness: Second Edition", 2016, 1, 5, 120, 180, ["Horror", "Adventure"], ["Cooperative Game", "App-Driven"], "cooperative", "Fantasy Flight Games", "An app-driven cooperative horror investigation."],
  ["Arkham Horror: The Card Game", 2016, 1, 2, 60, 120, ["Horror", "Card Game"], ["Cooperative Game", "Deck Building"], "cooperative", "Fantasy Flight Games", "A cooperative living card game of Lovecraftian investigation."],
  ["Eclipse", 2011, 2, 6, 120, 240, ["Sci-Fi", "Exploration"], ["Area Control", "Variable Player Powers"], "numeric", "Lautapelit.fi", "Explore, expand, and go to war across a galaxy of hex sectors."],
  ["Twilight Imperium (Fourth Edition)", 2017, 3, 6, 240, 480, ["Sci-Fi", "Negotiation"], ["Area Control", "Variable Player Powers"], "numeric", "Fantasy Flight Games", "An epic galaxy-spanning game of conquest, trade, and diplomacy."],
  ["War of the Ring (Second Edition)", 2011, 2, 4, 150, 180, ["Fantasy", "Wargame"], ["Area Control", "Variable Player Powers"], "numeric", "Ares Games", "Refight the War of the Ring as the Free Peoples or Sauron."],
  ["Star Wars: Rebellion", 2016, 2, 4, 180, 240, ["Sci-Fi", "Wargame"], ["Area Control", "Hidden Movement"], "numeric", "Fantasy Flight Games", "Command the Empire or the Rebellion across the galaxy."],
  ["Gaia Project", 2017, 1, 4, 60, 150, ["Sci-Fi", "Territory Building"], ["Area Control", "Engine Building"], "numeric", "Feuerland Spiele", "Terraform and expand across a sci-fi galaxy of alien factions."],
  ["Terra Mystica", 2012, 2, 5, 60, 150, ["Fantasy", "Territory Building"], ["Area Control", "Variable Player Powers"], "numeric", "Feuerland Spiele", "Transform terrain to expand your fantasy faction's territory."],
  ["Food Chain Magnate", 2015, 2, 5, 120, 210, ["Economic", "Business"], ["Hand Management", "Network Building"], "numeric", "Splotter Spellen", "Build competing fast-food empires in a cutthroat economic engine."],
  ["Barrage", 2019, 1, 4, 60, 150, ["Industrial", "Economic"], ["Worker Placement", "Area Control"], "numeric", "Cranio Creations", "Harness hydroelectric power in a race to dam the most rivers."],
  ["Underwater Cities", 2018, 1, 4, 30, 100, ["Sci-Fi", "Economic"], ["Engine Building", "Tableau Building"], "numeric", "Delicious Games", "Build colonies on the ocean floor in a near-future world."],
  ["On Mars", 2020, 1, 4, 90, 240, ["Sci-Fi", "Economic"], ["Worker Placement", "Engine Building"], "numeric", "Eagle-Gryphon Games", "Establish humanity's first permanent colony on Mars."],
  ["Anachrony", 2017, 1, 4, 90, 150, ["Sci-Fi", "Economic"], ["Worker Placement", "Time Travel"], "numeric", "Mindclash Games", "Rebuild civilization after an apocalypse, aided by glimpses of the future."],
  ["Nemesis", 2018, 1, 5, 90, 180, ["Horror", "Sci-Fi"], ["Semi-Cooperative", "Hidden Roles"], "cooperative", "Awaken Realms", "Survive an alien-infested spaceship — if your crewmates let you."],
  ["Dune: Imperium", 2020, 1, 4, 60, 120, ["Sci-Fi", "Card Game"], ["Deck Building", "Worker Placement"], "numeric", "Dire Wolf", "Blend deck-building and worker placement in the world of Dune."],
  ["Ark Nova", 2021, 1, 4, 90, 150, ["Economic", "Animals"], ["Engine Building", "Tableau Building"], "numeric", "Capstone Games", "Plan and build a modern, scientifically managed zoo."],
  ["Frosthaven", 2022, 1, 4, 60, 120, ["Adventure", "Fantasy"], ["Cooperative Game", "Hand Management"], "cooperative", "Cephalofair Games", "A standalone successor to Gloomhaven, in an unforgiving frozen valley."],
  ["Pax Pamir (Second Edition)", 2019, 1, 5, 60, 180, ["Economic", "Political"], ["Area Control", "Card Driven"], "numeric", "Wehrlegig Games", "Navigate shifting alliances in 19th-century Afghanistan."],
  ["A Feast for Odin", 2016, 1, 4, 30, 150, ["Economic", "Vikings"], ["Worker Placement", "Polyomino"], "numeric", "Z-Man Games", "Lead a Viking clan through raiding, farming, and exploration."],
  ["Trajan", 2011, 2, 4, 100, 100, ["Ancient", "Economic"], ["Worker Placement", "Mancala"], "numeric", "Rio Grande Games", "A mancala-driven worker-placement game set in ancient Rome."],
  ["Lisboa", 2017, 1, 4, 100, 150, ["Economic", "Renaissance"], ["Worker Placement", "Engine Building"], "numeric", "Eagle-Gryphon Games", "Rebuild Lisbon after the great earthquake of 1755."],
  ["The Castles of Burgundy", 2011, 1, 4, 30, 90, ["Dice", "Medieval"], ["Dice Rolling", "Tile Placement"], "numeric", "Alea", "Use dice rolls to develop your medieval Burgundian estate."],
  ["Tzolk'in: The Mayan Calendar", 2012, 2, 4, 90, 120, ["Civilization", "Economic"], ["Worker Placement", "Gear Mechanism"], "numeric", "Czech Games Edition", "Place workers on interlocking gears tied to the Mayan calendar."],
  ["Caverna: The Cave Farmers", 2013, 1, 7, 30, 150, ["Farming", "Fantasy"], ["Worker Placement"], "numeric", "Lookout Games", "Grow a dwarven cave-dwelling farmstead through the seasons."],
  ["Clans of Caledonia", 2017, 1, 4, 60, 150, ["Economic", "Farming"], ["Engine Building", "Route Building"], "numeric", "Karma Games", "Trade and produce goods across 19th-century Scotland."],
  ["Keyflower", 2012, 2, 6, 75, 150, ["Economic", "Medieval"], ["Worker Placement", "Auction/Bidding"], "numeric", "R&D Games", "Bid on and develop tiles to build a thriving village."],
  ["Suburbia", 2012, 1, 4, 90, 90, ["Economic", "City Building"], ["Tile Placement", "Engine Building"], "numeric", "Bezier Games", "Build a city of competing suburbs, balancing growth and reputation."],
  ["Orleans", 2014, 2, 4, 60, 90, ["Medieval", "Economic"], ["Bag Building", "Worker Placement"], "numeric", "dlp games", "Draw followers from a bag to develop a medieval trading town."],
  ["Village", 2011, 2, 4, 60, 90, ["Medieval", "Farming"], ["Worker Placement", "Area Control"], "numeric", "eggertspiele", "Build your family's legacy across generations in a medieval village."],
  ["Pandemic Legacy: Season 1", 2015, 2, 4, 60, 60, ["Medical", "Legacy"], ["Cooperative Game", "Legacy Game"], "cooperative", "Z-Man Games", "A year-long cooperative campaign where every decision changes the board forever."],
  ["Cartographers", 2019, 1, 6, 30, 45, ["Puzzle", "Fantasy"], ["Flip-and-Write", "Pattern Building"], "numeric", "Thunderworks Games", "Draw terrain onto your map to satisfy the Queen's decrees."],
  ["Calico", 2020, 1, 4, 30, 45, ["Puzzle", "Animals"], ["Tile Placement", "Pattern Building"], "numeric", "AEG", "Stitch together a cozy quilt pattern to attract cats."],
  ["Welcome To...", 2018, 1, 6, 25, 25, ["Puzzle", "City Building"], ["Flip-and-Write"], "numeric", "Deep Water Games", "A relaxed flip-and-write game of planning suburban streets."],
  ["Parks", 2019, 1, 5, 30, 60, ["Animals", "Travel"], ["Hand Management", "Worker Placement"], "numeric", "Keymaster Games", "Hike through a season inspired by US National Parks art."],
  ["Point Salad", 2019, 2, 6, 15, 30, ["Card Game", "Farming"], ["Drafting", "Set Collection"], "numeric", "AEG", "Draft vegetable cards to maximize clashing scoring conditions."],
  ["Quacks of Quedlinburg", 2018, 2, 4, 45, 45, ["Medieval", "Fantasy"], ["Push Your Luck", "Bag Building"], "numeric", "North Star Games", "Brew potions by pushing your luck drawing ingredients from a bag."],
  ["Wyrmspan", 2024, 1, 5, 40, 100, ["Animals", "Fantasy"], ["Engine Building", "Set Collection"], "numeric", "Stonemaier Games", "Wingspan's dragon-themed successor, building a hoard across a mountain lair."],
  ["Sky Team", 2023, 2, 2, 15, 20, ["Travel", "Cooperative"], ["Cooperative Game", "Dice Rolling"], "cooperative", "Le Scorpion Masqué", "A silent two-player cooperative game of landing an airplane together."],
  ["Harmonies", 2024, 1, 4, 30, 45, ["Abstract Strategy", "Animals"], ["Tile Placement", "Pattern Building"], "numeric", "Libellud", "Stack colorful terrain pieces to attract wildlife to your landscape."],
  ["Heat: Pedal to the Metal", 2022, 1, 6, 30, 75, ["Racing", "Sports"], ["Hand Management", "Programmed Movement"], "position", "Days of Wonder", "A card-driven racing game of slipstreams and engine heat management."],
  ["The Guild of Merchant Explorers", 2023, 1, 4, 30, 60, ["Exploration", "Puzzle"], ["Area Control", "Route Building"], "numeric", "Pandasaurus Games", "Chart exploration routes across an unfolding fantasy map."],
  ["Earth", 2024, 1, 5, 60, 90, ["Card Game", "Nature"], ["Engine Building", "Tableau Building"], "numeric", "Pencil First Games", "Grow a tableau of biomes and creatures in a nature-themed engine builder."],
  ["Marvel Champions: The Card Game", 2019, 1, 4, 45, 90, ["Card Game", "Superhero"], ["Cooperative Game", "Deck Building"], "cooperative", "Fantasy Flight Games", "Build hero decks and team up against iconic Marvel villains."],
  ["Castle Combo", 2023, 2, 5, 20, 30, ["Card Game", "Medieval"], ["Drafting", "Set Collection"], "numeric", "Ankama", "Draft and overlap building cards to build the best castle combo."],
  ["Sea Salt & Paper", 2023, 2, 6, 15, 20, ["Card Game"], ["Hand Management", "Push Your Luck"], "numeric", "Bombyx", "A quick, elegant card game of set collection and timing."],
  ["Daybreak", 2023, 1, 4, 60, 90, ["Environmental", "Cooperative"], ["Cooperative Game", "Engine Building"], "cooperative", "CMYK", "Work together to decarbonize the world before climate tipping points hit."],
  ["Final Girl", 2021, 1, 1, 30, 90, ["Horror", "Solo"], ["Cooperative Game", "Dice Rolling"], "cooperative", "Van Ryder Games", "A solo horror-movie survival game across a modular feature box system."],
  ["Oathsworn: Into the Deepwood", 2022, 1, 4, 90, 180, ["Fantasy", "Adventure"], ["Cooperative Game", "Hand Management"], "cooperative", "Shadowborne Games", "A narrative-driven cooperative dungeon crawler."],
  ["Hegemony: Lead Your Class to Victory", 2022, 1, 4, 180, 240, ["Economic", "Political"], ["Area Control", "Engine Building"], "numeric", "Hegemony Games", "Asymmetric classes battle over economic and political policy."],
  ["SETI: Search for Extraterrestrial Intelligence", 2024, 1, 4, 90, 150, ["Sci-Fi", "Exploration"], ["Engine Building", "Area Control"], "numeric", "Awaken Realms", "Launch missions and analyze signals racing to find extraterrestrial life."],
  ["Revive", 2023, 1, 4, 60, 100, ["Post-Apocalyptic", "Economic"], ["Worker Placement", "Area Control"], "numeric", "Giant Roc", "Rebuild civilization from the ruins of a fallen world."],
  ["Age of Innovation", 2024, 1, 5, 30, 150, ["Economic", "Territory Building"], ["Area Control", "Engine Building"], "numeric", "Feuerland Spiele", "A spiritual successor to Terra Mystica with modular, asymmetric factions."],
  ["Darwin's Journey", 2023, 1, 4, 80, 150, ["Exploration", "Educational"], ["Worker Placement", "Engine Building"], "numeric", "Board&Dice", "Follow Charles Darwin's voyage aboard the HMS Beagle."],
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run with: node --env-file=.env.local scripts/seed-games.mjs");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const seenSlugs = new Map();
  const rows = GAMES.map(
    ([title, year, minP, maxP, minT, maxT, categories, mechanics, scoringType, publisher, description]) => {
      let slug = slugify(title);
      if (seenSlugs.has(slug)) slug = `${slug}-${year}`;
      seenSlugs.set(slug, true);

      return {
        slug,
        title,
        description,
        image_url: null,
        publisher,
        year_published: year,
        min_players: minP,
        max_players: maxP,
        playtime_minutes_min: minT,
        playtime_minutes_max: maxT,
        categories,
        mechanics,
        scoring_type: scoringType,
        // Always written (null when absent) — scoring-schemas.mjs is the
        // source of truth, so a schema removed there is removed here too.
        scoring_schema: SCORING_SCHEMAS[slug] ?? null,
      };
    },
  );

  const unknownSchemaSlugs = Object.keys(SCORING_SCHEMAS).filter((slug) => !seenSlugs.has(slug));
  if (unknownSchemaSlugs.length > 0) {
    console.error(`scoring-schemas.mjs has entries for unknown slugs: ${unknownSchemaSlugs.join(", ")}`);
    process.exit(1);
  }

  console.log(`Upserting ${rows.length} games...`);
  const { data, error } = await supabase.from("games").upsert(rows, { onConflict: "slug" }).select("slug");

  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Done. Upserted ${data.length} games (${Object.keys(SCORING_SCHEMAS).length} with scoring schemas).`);
  console.log("image_url is null for all rows — see the comment at the top of this file.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
