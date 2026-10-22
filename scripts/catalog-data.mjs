// Loads and validates the curated catalog from data/games.csv and
// data/scoring.csv — the source of truth for scripts/seed-games.mjs and
// scripts/check-data.mjs. Never imported by the app: the app reads the
// catalog from Supabase, so these files only matter when seeding.
//
// data/games.csv: one row per game. `categories` and `mechanics` are
// "; "-separated lists. `image_url` must be a real BoardGameGeek CDN URL
// copied from the game's BGG page — never one written from memory: BGG image
// paths are opaque hashes, and a plausible-looking guess is a broken or
// wrong image. Leave it blank for no image. `hidden` is `true` to retire a
// game from search, browse and logging while keeping its sessions (blank
// means visible); games with logged sessions can't be deleted, only hidden.
//
// data/scoring.csv: one row per scoring category (shape: ScoringCategory in
// src/lib/scoring.ts), ordered within a game by `order`. `penalty` is `true`
// for categories subtracted from the total (players enter the plain amount;
// blank means not a penalty). `type` is `choice` for fields that record what
// was picked rather than scored (Small World's races): they never count
// toward the total, `options` lists the allowed values ("; "-separated; blank
// means free text) and `multiple` is `true` when several can be picked.
// Blank `type` means a scored number. Choice fields sharing a `group` key
// (snake_case, unique within the game) are entered together as repeatable
// rows — Small World's race + special power, one row per combo.
// `show_in_feed` is `true` to show the field on feed cards: player fields
// under the player's name, team fields under the game result (blank = no;
// fields in one group must agree). `status` is
// `approved` or `draft`; a game with any draft row is seeded with no schema
// until every row is approved. Never rename a `key` once sessions have been
// logged — saved breakdowns are keyed by it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DATA_DIR = fileURLToPath(new URL("../data/", import.meta.url));

const GAME_COLUMNS = [
  "slug", "title", "year", "min_players", "max_players", "min_playtime", "max_playtime",
  "scoring_type", "publisher", "categories", "mechanics", "description", "image_url", "hidden",
];
const SCORING_COLUMNS = [
  "slug", "order", "key", "label", "type", "scope", "contributes_to_total", "penalty", "options", "multiple",
  "group", "show_in_feed", "description", "status", "source",
];

// Mirrors SCORING_TYPES in src/lib/games.ts.
const SCORING_TYPES = ["numeric", "position", "winner_only", "cooperative"];
const STATUSES = ["approved", "draft"];
// Form field names are `participant-<id>-<field>`, so a category key equal to
// one of a player's own fields would be read as that field.
const RESERVED_KEYS = ["name", "score", "position", "winner"];

/** RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Spreadsheet apps often leave trailing blank lines.
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function serializeCsvCell(value) {
  return /[",\n\r]/.test(value) || value !== value.trim() ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Rewrites a data/ CSV file keeping only the rows `keep` returns true for (header always kept). */
export function filterCsvRows(file, keep) {
  const [header, ...rows] = parseCsv(readFileSync(DATA_DIR + file, "utf8"));
  const kept = rows.filter((row) => keep(Object.fromEntries(header.map((h, i) => [h.trim(), (row[i] ?? "").trim()]))));
  writeFileSync(DATA_DIR + file, [header, ...kept].map((row) => row.map(serializeCsvCell).join(",")).join("\n") + "\n");
  return rows.length - kept.length;
}

/** Parses a CSV file into objects keyed by header, recording each row's line for error messages. */
function readTable(file, columns, errors) {
  const [header, ...rows] = parseCsv(readFileSync(DATA_DIR + file, "utf8"));
  const actual = (header ?? []).map((h) => h.trim());
  if (actual.join(",") !== columns.join(",")) {
    errors.push(`${file}: header must be exactly: ${columns.join(",")}`);
    return [];
  }
  return rows.map((values, i) => {
    const record = { _where: `${file} row ${i + 2}` };
    columns.forEach((col, j) => (record[col] = (values[j] ?? "").trim()));
    if (values.length > columns.length) errors.push(`${record._where}: has ${values.length} columns, expected ${columns.length}`);
    return record;
  });
}

function int(record, col, errors, { optional = false } = {}) {
  const raw = record[col];
  if (raw === "" && optional) return null;
  if (!/^\d+$/.test(raw)) {
    errors.push(`${record._where}: ${col} must be a whole number, got "${raw}"`);
    return null;
  }
  return Number(raw);
}

function list(raw) {
  return raw.split(";").map((s) => s.trim()).filter(Boolean);
}

/**
 * Returns { games, schemas, drafts, errors }: `games` are rows ready to
 * upsert into the `games` table, `schemas` maps slug → ScoringCategory[] for
 * fully approved games, `drafts` lists slugs held back by draft rows.
 */
export function loadCatalog() {
  const errors = [];
  const gameRecords = readTable("games.csv", GAME_COLUMNS, errors);
  const scoringRecords = readTable("scoring.csv", SCORING_COLUMNS, errors);

  const games = [];
  const slugs = new Set();
  for (const r of gameRecords) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) errors.push(`${r._where}: slug "${r.slug}" must be lowercase-with-dashes`);
    if (slugs.has(r.slug)) errors.push(`${r._where}: duplicate slug "${r.slug}"`);
    slugs.add(r.slug);
    if (!r.title) errors.push(`${r._where}: title is required`);
    if (!SCORING_TYPES.includes(r.scoring_type)) {
      errors.push(`${r._where}: scoring_type must be one of ${SCORING_TYPES.join(", ")}, got "${r.scoring_type}"`);
    }
    if (r.image_url && !/^https:\/\/cf\.geekdo-images\.com\/\S+$/.test(r.image_url)) {
      errors.push(`${r._where}: image_url must be a https://cf.geekdo-images.com/ URL copied from BGG`);
    }
    if (r.hidden !== "" && r.hidden !== "true" && r.hidden !== "false") {
      errors.push(`${r._where}: hidden must be "true", "false" or blank, got "${r.hidden}"`);
    }
    const year = int(r, "year", errors, { optional: true });
    const minP = int(r, "min_players", errors, { optional: true });
    const maxP = int(r, "max_players", errors, { optional: true });
    const minT = int(r, "min_playtime", errors, { optional: true });
    const maxT = int(r, "max_playtime", errors, { optional: true });
    if (minP !== null && maxP !== null && minP > maxP) errors.push(`${r._where}: min_players is greater than max_players`);
    if (minT !== null && maxT !== null && minT > maxT) errors.push(`${r._where}: min_playtime is greater than max_playtime`);

    games.push({
      slug: r.slug,
      title: r.title,
      description: r.description || null,
      image_url: r.image_url || null,
      publisher: r.publisher || null,
      year_published: year,
      min_players: minP,
      max_players: maxP,
      playtime_minutes_min: minT,
      playtime_minutes_max: maxT,
      categories: list(r.categories),
      mechanics: list(r.mechanics),
      scoring_type: r.scoring_type,
      is_hidden: r.hidden === "true",
    });
  }

  const bySlug = new Map();
  for (const r of scoringRecords) {
    if (!slugs.has(r.slug)) {
      errors.push(`${r._where}: unknown slug "${r.slug}" — add the game to games.csv first`);
      continue;
    }
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug).push(r);
  }

  const schemas = {};
  const drafts = [];
  for (const [slug, records] of bySlug) {
    const keys = new Set();
    const orders = new Set();
    for (const r of records) {
      if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(r.key)) errors.push(`${r._where}: key "${r.key}" must be lowercase_snake_case`);
      if (RESERVED_KEYS.includes(r.key)) errors.push(`${r._where}: key "${r.key}" is reserved — pick another`);
      if (keys.has(r.key)) errors.push(`${r._where}: duplicate key "${r.key}" for ${slug}`);
      keys.add(r.key);
      const order = int(r, "order", errors);
      if (order !== null && orders.has(order)) errors.push(`${r._where}: duplicate order ${order} for ${slug}`);
      orders.add(order);
      if (!r.label) errors.push(`${r._where}: label is required`);
      if (r.scope !== "player" && r.scope !== "team") errors.push(`${r._where}: scope must be "player" or "team", got "${r.scope}"`);
      if (r.contributes_to_total !== "true" && r.contributes_to_total !== "false") {
        errors.push(`${r._where}: contributes_to_total must be "true" or "false", got "${r.contributes_to_total}"`);
      }
      if (r.penalty !== "" && r.penalty !== "true" && r.penalty !== "false") {
        errors.push(`${r._where}: penalty must be "true", "false" or blank, got "${r.penalty}"`);
      }
      if (r.penalty === "true" && r.contributes_to_total !== "true") {
        errors.push(`${r._where}: a penalty must have contributes_to_total "true" (it's subtracted from the total)`);
      }
      if (r.type !== "" && r.type !== "number" && r.type !== "choice") {
        errors.push(`${r._where}: type must be "number", "choice" or blank, got "${r.type}"`);
      }
      if (r.multiple !== "" && r.multiple !== "true" && r.multiple !== "false") {
        errors.push(`${r._where}: multiple must be "true", "false" or blank, got "${r.multiple}"`);
      }
      if (r.type === "choice") {
        if (r.contributes_to_total !== "false") errors.push(`${r._where}: a choice field must have contributes_to_total "false"`);
        if (r.penalty === "true") errors.push(`${r._where}: a choice field can't be a penalty`);
        const options = list(r.options);
        if (new Set(options).size !== options.length) errors.push(`${r._where}: options has duplicates`);
        if (options.some((o) => o.length > 60)) errors.push(`${r._where}: options must be 60 characters or fewer`);
        if (r.group && r.multiple === "true") errors.push(`${r._where}: a grouped field can't be multiple — each row holds one value`);
      } else if (r.options !== "" || r.multiple === "true" || r.group !== "") {
        errors.push(`${r._where}: options, multiple and group only apply to type "choice"`);
      }
      if (r.show_in_feed !== "" && r.show_in_feed !== "true" && r.show_in_feed !== "false") {
        errors.push(`${r._where}: show_in_feed must be "true", "false" or blank, got "${r.show_in_feed}"`);
      }
      if (r.group && !/^[a-z0-9]+(_[a-z0-9]+)*$/.test(r.group)) errors.push(`${r._where}: group "${r.group}" must be lowercase_snake_case`);
      if (!STATUSES.includes(r.status)) errors.push(`${r._where}: status must be one of ${STATUSES.join(", ")}, got "${r.status}"`);
    }

    const groupScopes = new Map();
    const groupFeed = new Map();
    for (const r of records.filter((r) => r.group)) {
      const inFeed = r.show_in_feed === "true";
      if (groupFeed.has(r.group) && groupFeed.get(r.group) !== inFeed) {
        errors.push(`${r._where}: every field in group "${r.group}" must have the same show_in_feed`);
      }
      groupFeed.set(r.group, inFeed);
      if (keys.has(r.group)) errors.push(`${r._where}: group "${r.group}" is also a field key for ${slug}`);
      if (RESERVED_KEYS.includes(r.group)) errors.push(`${r._where}: group "${r.group}" is reserved — pick another`);
      if (groupScopes.has(r.group) && groupScopes.get(r.group) !== r.scope) {
        errors.push(`${r._where}: every field in group "${r.group}" must have the same scope`);
      }
      groupScopes.set(r.group, r.scope);
    }

    if (records.some((r) => r.status === "draft")) {
      drafts.push(slug);
      continue;
    }
    schemas[slug] = records
      .toSorted((a, b) => Number(a.order) - Number(b.order))
      .map((r) => ({
        key: r.key,
        label: r.label,
        ...(r.description ? { description: r.description } : {}),
        scope: r.scope,
        ...(r.type === "choice" ? { type: "choice" } : {}),
        ...(list(r.options).length > 0 ? { options: list(r.options) } : {}),
        ...(r.multiple === "true" ? { multiple: true } : {}),
        ...(r.group ? { group: r.group } : {}),
        ...(r.show_in_feed === "true" ? { showInFeed: true } : {}),
        contributesToTotal: r.contributes_to_total === "true",
        ...(r.penalty === "true" ? { penalty: true } : {}),
      }));
  }

  return { games, schemas, drafts, errors };
}
