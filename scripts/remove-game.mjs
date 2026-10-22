// One-off/admin tool — not part of the app bundle. Removes a game from the
// catalog: its rows in data/games.csv and data/scoring.csv, and its row in
// the database (seeding only upserts, so dropping CSV rows alone would
// leave the game live).
//
// Usage: npm run remove:game -- <slug>          (dry run: shows what would happen)
//        npm run remove:game -- <slug> --yes    (does it)
//
// Refuses games with logged sessions — game_sessions.game_id is ON DELETE
// RESTRICT to protect players' history. Hide those instead (`hidden` = true
// in data/games.csv, then re-seed).

import { createClient } from "@supabase/supabase-js";
import { filterCsvRows, loadCatalog } from "./catalog-data.mjs";

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--yes");
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    console.error("Usage: npm run remove:game -- <slug> [--yes]");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run with: npm run remove:game -- <slug>");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { games, schemas } = loadCatalog();
  const inCsv = games.some((g) => g.slug === slug);

  const { data: game, error: gameError } = await supabase.from("games").select("id, title").eq("slug", slug).maybeSingle();
  if (gameError) {
    console.error("Lookup failed:", gameError.message);
    process.exit(1);
  }

  let sessionCount = 0;
  if (game) {
    const { count, error } = await supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id);
    if (error) {
      console.error("Session count failed:", error.message);
      process.exit(1);
    }
    sessionCount = count ?? 0;
  }

  if (!inCsv && !game) {
    console.error(`No game with slug "${slug}" in data/games.csv or the database.`);
    process.exit(1);
  }

  console.log(`Game "${slug}"${game ? ` (${game.title})` : ""}:`);
  console.log(`  data/games.csv:   ${inCsv ? "present" : "absent"}`);
  console.log(`  scoring schema:   ${schemas[slug] ? `${schemas[slug].length} categories` : "none approved"}`);
  console.log(`  database:         ${game ? "present" : "absent"}`);
  console.log(`  logged sessions:  ${sessionCount}`);

  if (sessionCount > 0) {
    console.error(
      `\nCan't remove: ${sessionCount} logged session(s) reference this game. ` +
        `Hide it instead (set hidden to true in data/games.csv, then npm run seed:games).`,
    );
    process.exit(1);
  }

  if (!confirmed) {
    console.log("\nDry run — nothing changed. Re-run with --yes to remove.");
    return;
  }

  if (game) {
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) {
      console.error("Delete failed — CSVs left untouched:", error.message);
      process.exit(1);
    }
  }
  const removedGames = filterCsvRows("games.csv", (row) => row.slug !== slug);
  const removedScoring = filterCsvRows("scoring.csv", (row) => row.slug !== slug);

  console.log(
    `\nRemoved: ${game ? "database row, " : ""}${removedGames} games.csv row(s), ${removedScoring} scoring.csv row(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
