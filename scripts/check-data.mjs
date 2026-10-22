// Validates data/games.csv and data/scoring.csv without touching the
// database. Run before seeding: npm run check:data

import { loadCatalog } from "./catalog-data.mjs";

const { games, schemas, drafts, errors } = loadCatalog();

if (errors.length > 0) {
  console.error(`Found ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`OK: ${games.length} games, ${Object.keys(schemas).length} approved scoring schemas.`);
if (drafts.length > 0) console.log(`Drafts (not seeded until approved): ${drafts.join(", ")}`);
