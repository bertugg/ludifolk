// One-off/admin tool — not part of the app bundle. Seeds (and re-enriches)
// the `games` catalog from BoardGameGeek's XML API2, hotlinking BGG's own
// cover-image URLs directly (no re-hosting).
//
// Usage: node --env-file=.env.local scripts/import-games.mjs
//
// Requests go through a real headless Chromium (Playwright), not plain
// fetch: BGG sits behind Cloudflare bot management that returns a flat
// 401/403 to any non-browser HTTP client regardless of headers/UA — this
// was confirmed to be TLS/HTTP2-fingerprint-based, not IP-based (same
// failure from two unrelated networks). A real browser's network stack
// passes it the same way a human visiting the URL would.
//
// Resolves each title in CURATED_TITLES to a BGG id via the search API,
// batch-fetches full details via the `thing` endpoint, and upserts into
// `games` (on slug, so re-running is idempotent and will also backfill
// bgg_id/image_url/description onto any already-existing rows with the
// same slug — including the ones scripts/seed-games.mjs already put there).
//
// Edit CURATED_TITLES to add more games on a future run.

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { XMLParser } from "fast-xml-parser";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
const BATCH_SIZE = 20;
const REQUEST_DELAY_MS = 600;

// Known exceptions where BGG's data gives no reliable signal for our
// scoring_type (numeric | position | winner_only | cooperative). Anything
// not listed here defaults to 'numeric', unless BGG tags the game with the
// "Cooperative Game" mechanic, which always wins. Kept in sync with
// scripts/seed-games.mjs.
const SCORING_TYPE_OVERRIDES = {
  "Ticket to Ride": "position",
  Codenames: "winner_only",
  "Love Letter": "winner_only",
  Coup: "winner_only",
  "Camel Up": "winner_only",
  "Exploding Kittens": "winner_only",
  "Betrayal at House on the Hill": "winner_only",
  Risk: "winner_only",
  Clue: "winner_only",
  Chess: "winner_only",
  "Heat: Pedal to the Metal": "position",
};

// Kept in sync with scripts/seed-games.mjs's GAMES list.
const CURATED_TITLES = [
  "Catan",
  "Carcassonne",
  "Ticket to Ride",
  "Pandemic",
  "Codenames",
  "Splendor",
  "Azul",
  "7 Wonders",
  "Dominion",
  "Love Letter",
  "King of Tokyo",
  "Dixit",
  "Coup",
  "Sushi Go!",
  "Patchwork",
  "Kingdomino",
  "Sagrada",
  "Camel Up",
  "Forbidden Island",
  "Forbidden Desert",
  "Hanabi",
  "Jaipur",
  "Lost Cities",
  "Bohnanza",
  "Exploding Kittens",
  "Just One",
  "The Crew: The Quest for Planet Nine",
  "Wavelength",
  "Mysterium",
  "Betrayal at House on the Hill",
  "Scrabble",
  "Monopoly",
  "Risk",
  "Clue",
  "Chess",
  "Terraforming Mars",
  "Gloomhaven",
  "Spirit Island",
  "Scythe",
  "Root",
  "Brass: Birmingham",
  "Agricola",
  "Puerto Rico",
  "Power Grid",
  "El Grande",
  "Twilight Struggle",
  "Through the Ages: A New Story of Civilization",
  "Great Western Trail",
  "Concordia",
  "Viticulture",
  "Res Arcana",
  "Blood Rage",
  "Everdell",
  "Cascadia",
  "Lost Ruins of Arnak",
  "Wingspan",
  "Mansions of Madness: Second Edition",
  "Arkham Horror: The Card Game",
  "Eclipse",
  "Twilight Imperium (Fourth Edition)",
  "War of the Ring (Second Edition)",
  "Star Wars: Rebellion",
  "Gaia Project",
  "Terra Mystica",
  "Food Chain Magnate",
  "Barrage",
  "Underwater Cities",
  "On Mars",
  "Anachrony",
  "Nemesis",
  "Dune: Imperium",
  "Ark Nova",
  "Frosthaven",
  "Pax Pamir (Second Edition)",
  "A Feast for Odin",
  "Trajan",
  "Lisboa",
  "The Castles of Burgundy",
  "Tzolk'in: The Mayan Calendar",
  "Caverna: The Cave Farmers",
  "Clans of Caledonia",
  "Keyflower",
  "Suburbia",
  "Orleans",
  "Village",
  "Pandemic Legacy: Season 1",
  "Cartographers",
  "Calico",
  "Welcome To...",
  "Parks",
  "Point Salad",
  "Quacks of Quedlinburg",
  "Wyrmspan",
  "Sky Team",
  "Harmonies",
  "Heat: Pedal to the Metal",
  "The Guild of Merchant Explorers",
  "Earth",
  "Marvel Champions: The Card Game",
  "Castle Combo",
  "Sea Salt & Paper",
  "Daybreak",
  "Final Girl",
  "Oathsworn: Into the Deepwood",
  "Hegemony: Lead Your Class to Victory",
  "SETI: Search for Extraterrestrial Intelligence",
  "Revive",
  "Age of Innovation",
  "Darwin's Journey",
];

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let browserPage = null;

async function fetchXml(url, { retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await browserPage.goto(url, { waitUntil: "domcontentloaded" });
    const status = response.status();
    if (status === 202) {
      // BGG queues the request on first hit; wait and retry.
      await sleep(2000);
      continue;
    }
    if (status === 403 || status === 401) {
      throw new Error(`BGG blocked the request (${status}) even through a real browser: ${url}`);
    }
    if (!response.ok()) {
      throw new Error(`BGG request failed (${status}): ${url}`);
    }
    return response.text();
  }
  throw new Error(`BGG request kept returning 202 (queued): ${url}`);
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function resolveBggId(title) {
  const url = `${BGG_BASE}/search?type=boardgame&exact=1&query=${encodeURIComponent(title)}`;
  const xml = await fetchXml(url);
  const parsed = parser.parse(xml);
  let items = toArray(parsed?.items?.item);

  if (!items.length) {
    const fallbackUrl = `${BGG_BASE}/search?type=boardgame&query=${encodeURIComponent(title)}`;
    const fallbackXml = await fetchXml(fallbackUrl);
    items = toArray(parser.parse(fallbackXml)?.items?.item);
  }

  if (!items.length) return null;
  return items[0]["@_id"];
}

function textOf(node) {
  if (node === undefined) return null;
  if (typeof node === "string") return node;
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  return null;
}

// BGG's description text is double HTML-entity-encoded (a long-documented
// API quirk — e.g. a literal newline comes through as the still-escaped
// "&#10;", a right quote as "&rsquo;"). fast-xml-parser only unescapes one
// level (the outer "&amp;" -> "&"), so this decodes what's left.
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  nbsp: " ",
};

function decodeEntities(str) {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
    if (code[0] === "#") {
      const codepoint = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(codepoint) ? match : String.fromCodePoint(codepoint);
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

function parseGameItem(item) {
  const names = toArray(item.name);
  const primaryName = names.find((n) => n["@_type"] === "primary") ?? names[0];
  const title = primaryName?.["@_value"];
  if (!title) return null;

  const links = toArray(item.link);
  const categories = links.filter((l) => l["@_type"] === "boardgamecategory").map((l) => l["@_value"]).slice(0, 6);
  const mechanics = links.filter((l) => l["@_type"] === "boardgamemechanic").map((l) => l["@_value"]).slice(0, 6);
  const publisher = links.find((l) => l["@_type"] === "boardgamepublisher")?.["@_value"] ?? null;
  const isCooperative = links.some(
    (l) => l["@_type"] === "boardgamemechanic" && l["@_value"] === "Cooperative Game",
  );

  const scoringType = SCORING_TYPE_OVERRIDES[title] ?? (isCooperative ? "cooperative" : "numeric");

  const description = textOf(item.description);

  return {
    bgg_id: Number(item["@_id"]),
    title,
    slug: slugify(title),
    description: description ? decodeEntities(description).replace(/\s+/g, " ").trim() : null,
    image_url: textOf(item.image) || null,
    publisher,
    year_published: item.yearpublished ? Number(item.yearpublished["@_value"]) : null,
    min_players: item.minplayers ? Number(item.minplayers["@_value"]) : null,
    max_players: item.maxplayers ? Number(item.maxplayers["@_value"]) : null,
    playtime_minutes_min: item.minplaytime ? Number(item.minplaytime["@_value"]) : null,
    playtime_minutes_max: item.maxplaytime ? Number(item.maxplaytime["@_value"]) : null,
    categories,
    mechanics,
    scoring_type: scoringType,
  };
}

async function fetchGameDetails(ids) {
  const url = `${BGG_BASE}/thing?stats=1&id=${ids.join(",")}`;
  const xml = await fetchXml(url);
  const parsed = parser.parse(xml);
  const items = toArray(parsed?.items?.item);
  return items.map(parseGameItem).filter((g) => g !== null);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run with: node --env-file=.env.local scripts/import-games.mjs");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  browserPage = await context.newPage();

  try {
    console.log(`Resolving ${CURATED_TITLES.length} titles to BGG ids...`);
    const unresolved = [];
    const ids = [];
    for (const title of CURATED_TITLES) {
      const id = await resolveBggId(title);
      if (id) {
        ids.push(id);
      } else {
        unresolved.push(title);
        console.warn(`  no BGG match for "${title}"`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
    console.log(`Resolved ${ids.length}/${CURATED_TITLES.length}.`);

    console.log("Fetching full details...");
    const games = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const details = await fetchGameDetails(batch);
      games.push(...details);
      console.log(`  fetched ${games.length}/${ids.length}`);
      if (i + BATCH_SIZE < ids.length) await sleep(REQUEST_DELAY_MS);
    }

    // Slug collisions (rare — distinct titles can still normalize to the
    // same slug): disambiguate with the bgg id rather than silently
    // dropping one.
    const seenSlugs = new Map();
    for (const game of games) {
      if (seenSlugs.has(game.slug)) {
        game.slug = `${game.slug}-${game.bgg_id}`;
      }
      seenSlugs.set(game.slug, true);
    }

    console.log(`Upserting ${games.length} games...`);
    const { data, error } = await supabase.from("games").upsert(games, { onConflict: "slug" }).select("slug");

    if (error) {
      console.error("Upsert failed:", error.message);
      process.exit(1);
    }

    console.log(`Done. Upserted ${data.length} games.`);
    if (unresolved.length) {
      console.log(`Unresolved titles (check spelling or add manually): ${unresolved.join(", ")}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
