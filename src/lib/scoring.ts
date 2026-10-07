export type ScoringCategory = {
  key: string;
  label: string;
  description?: string;
  scope: "player" | "team";
  contributesToTotal: boolean;
};

/** games.scoring_schema is untyped jsonb — validate its shape before trusting it. */
export function parseScoringSchema(raw: unknown): ScoringCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is ScoringCategory =>
      c &&
      typeof c === "object" &&
      typeof c.key === "string" &&
      typeof c.label === "string" &&
      (c.scope === "player" || c.scope === "team") &&
      typeof c.contributesToTotal === "boolean",
  );
}

export function playerCategories(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "player");
}

export function teamCategories(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "team");
}

export type Breakdown = Record<string, number | null | undefined>;

/** jsonb breakdown values are untyped — coerce to a clean numeric map. */
export function parseBreakdown(raw: unknown): Breakdown {
  if (!raw || typeof raw !== "object") return {};
  const result: Breakdown = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
  }
  return result;
}

/**
 * The total is only computable when every contributing category has a
 * known value — a partial breakdown must never be silently summed as if
 * complete (a missing category is "unknown", not zero).
 */
export function computeCategoryTotal(breakdown: Breakdown, categories: ScoringCategory[]): number | null {
  const contributing = categories.filter((c) => c.contributesToTotal);
  if (contributing.length === 0) return null;
  const values = contributing.map((c) => breakdown[c.key]);
  if (values.some((v) => v === null || v === undefined)) return null;
  return values.reduce<number>((sum, v) => sum + (v as number), 0);
}

export function hasAnyValue(breakdown: Breakdown): boolean {
  return Object.values(breakdown).some((v) => v !== null && v !== undefined);
}
