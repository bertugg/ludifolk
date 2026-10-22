// One-off/admin tool — not part of the app bundle. Seeds the `games`
// catalog from data/games.csv and data/scoring.csv (loaded and validated by
// scripts/catalog-data.mjs). The rows were hand-curated from general
// knowledge (no live BGG access — see scripts/import-games.mjs for the
// BGG-API-driven version, currently blocked by Cloudflare bot protection).
//
// Usage: npm run check:data && npm run seed:games
//
// To add, hide or change a game, cover image or scoring schema: edit the
// CSVs, then re-run the seed against each environment.
//
// Upserts on slug, so re-running is safe and idempotent — it will also
// enrich any existing row (by slug) with fresher data.

import { createClient } from "@supabase/supabase-js";
import { loadCatalog } from "./catalog-data.mjs";

async function main() {
  const { games, schemas, drafts, errors } = loadCatalog();
  if (errors.length > 0) {
    console.error(`Catalog data has ${errors.length} problem(s) — nothing was written:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run with: node --env-file=.env.local scripts/seed-games.mjs");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const rows = games.map((game) => ({
    ...game,
    // Always written (null when absent or still draft) — scoring.csv is the
    // source of truth, so a schema removed there is removed here too.
    scoring_schema: schemas[game.slug] ?? null,
  }));

  console.log(`Upserting ${rows.length} games...`);
  const { data, error } = await supabase.from("games").upsert(rows, { onConflict: "slug" }).select("slug");

  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(
    `Done. Upserted ${data.length} games (${rows.filter((r) => r.image_url).length} with images, ` +
      `${Object.keys(schemas).length} with scoring schemas).`,
  );
  if (drafts.length > 0) console.log(`Skipped draft scoring schemas: ${drafts.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
