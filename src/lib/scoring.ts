export type ScoringCategory = {
  key: string;
  label: string;
  description?: string;
  scope: "player" | "team";
  /**
   * "number" (the default) is a scored amount. "choice" records what was
   * picked — Small World's races, the map played — and never affects scores;
   * its values live in game_participants.choices / game_sessions.team_choices.
   */
  type?: "number" | "choice";
  /** Choice only: the allowed values. Without options, a choice is free text. */
  options?: string[];
  /** Choice only: more than one value can be picked. */
  multiple?: boolean;
  /**
   * Choice only: choice fields sharing a group key are entered together as
   * repeatable rows — Small World's race + special power, one row per combo
   * a player had. Stored under the group key as an array of
   * { [field key]: value } rows.
   */
  group?: string;
  contributesToTotal: boolean;
  /**
   * Subtracted from the total (Azul's floor line, Dominion's curses). Players
   * enter the plain amount; it's stored negated so a breakdown always holds
   * each category's signed contribution.
   */
  penalty?: boolean;
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
      typeof c.contributesToTotal === "boolean" &&
      (c.penalty === undefined || typeof c.penalty === "boolean") &&
      (c.type === undefined || c.type === "number" || c.type === "choice") &&
      (c.options === undefined || (Array.isArray(c.options) && c.options.every((o: unknown) => typeof o === "string"))) &&
      (c.multiple === undefined || typeof c.multiple === "boolean") &&
      (c.group === undefined || typeof c.group === "string"),
  );
}

function isChoice(c: ScoringCategory): boolean {
  return c.type === "choice";
}

/** A category's signed contribution — penalties always count against the total, whichever sign was typed. */
export function signedCategoryValue(category: ScoringCategory, value: number): number {
  return category.penalty ? -Math.abs(value) : value;
}

/** What a score-entry field shows for a stored value: penalties as their plain amount. */
export function categoryEntryValue(category: ScoringCategory, value: number): number {
  return category.penalty ? Math.abs(value) : value;
}

/** Signs a submitted breakdown for storage; keys outside `categories` pass through unchanged. */
export function signBreakdown(breakdown: Record<string, number>, categories: ScoringCategory[]): Record<string, number> {
  const result = { ...breakdown };
  for (const c of categories) {
    if (result[c.key] !== undefined) result[c.key] = signedCategoryValue(c, result[c.key]);
  }
  return result;
}

/** Scored (numeric) per-player categories — choice fields excluded. */
export function playerCategories(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "player" && !isChoice(c));
}

/** Scored (numeric) whole-session categories — choice fields excluded. */
export function teamCategories(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "team" && !isChoice(c));
}

/** Standalone per-player choice fields — grouped ones are in playerChoiceGroups. */
export function playerChoiceFields(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "player" && isChoice(c) && !c.group);
}

/** Standalone whole-session choice fields — grouped ones are in teamChoiceGroups. */
export function teamChoiceFields(schema: ScoringCategory[]): ScoringCategory[] {
  return schema.filter((c) => c.scope === "team" && isChoice(c) && !c.group);
}

export type ChoiceGroup = { key: string; label: string; parts: ScoringCategory[] };

function choiceGroups(schema: ScoringCategory[], scope: ScoringCategory["scope"]): ChoiceGroup[] {
  const groups = new Map<string, ScoringCategory[]>();
  for (const c of schema) {
    if (c.scope !== scope || !isChoice(c) || !c.group) continue;
    groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  }
  return [...groups].map(([key, parts]) => ({ key, label: parts.map((p) => p.label).join(" / "), parts }));
}

export function playerChoiceGroups(schema: ScoringCategory[]): ChoiceGroup[] {
  return choiceGroups(schema, "player");
}

export function teamChoiceGroups(schema: ScoringCategory[]): ChoiceGroup[] {
  return choiceGroups(schema, "team");
}

export type Choices = Record<string, string[]>;
/** One row of a choice group: field key → picked value. */
export type ChoiceRow = Record<string, string>;
export type ChoiceGroups = Record<string, ChoiceRow[]>;

/** jsonb choices are untyped — coerce to a clean map of string arrays. */
export function parseChoices(raw: unknown): Choices {
  if (!raw || typeof raw !== "object") return {};
  const result: Choices = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    // Choice groups (arrays of row objects) share this column — see parseChoiceGroups.
    const strings = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
    if (strings.length > 0) result[key] = strings;
  }
  return result;
}

/** The choice-group rows stored alongside plain choices in the same jsonb column. */
export function parseChoiceGroups(raw: unknown): ChoiceGroups {
  if (!raw || typeof raw !== "object") return {};
  const result: ChoiceGroups = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const rows = value
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
      .map((r) =>
        Object.fromEntries(Object.entries(r).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "")),
      )
      .filter((r) => Object.keys(r).length > 0);
    if (rows.length > 0) result[key] = rows;
  }
  return result;
}

/** Combines plain choices and group rows into the one jsonb value; null when empty. */
export function choiceData(choices: Choices | null, groups: ChoiceGroups | null) {
  const merged = { ...choices, ...groups };
  return Object.keys(merged).length > 0 ? merged : null;
}

const MAX_FREE_TEXT_CHOICE_LENGTH = 60;
const MAX_CHOICE_GROUP_ROWS = 12;

function cleanChoiceValue(field: ScoringCategory, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (field.options?.length) return field.options.includes(value) ? value : null;
  return value.slice(0, MAX_FREE_TEXT_CHOICE_LENGTH);
}

/**
 * Reads choice-group rows named `${prefix}-group-${group}-${row}-${field}`.
 * Values outside a field's options are dropped, rows with nothing picked are
 * skipped, and rows keep their submitted order. Null when nothing was picked.
 */
export function readChoiceGroups(formData: FormData, prefix: string, groups: ChoiceGroup[]): ChoiceGroups | null {
  const result: ChoiceGroups = {};
  for (const group of groups) {
    const rows = new Map<number, ChoiceRow>();
    for (const part of group.parts) {
      const pattern = new RegExp(`^${escapeRegExp(`${prefix}-group-${group.key}-`)}(\\d+)-${escapeRegExp(part.key)}$`);
      for (const [name, raw] of formData.entries()) {
        const match = name.match(pattern);
        const value = match && cleanChoiceValue(part, String(raw));
        if (!value) continue;
        const index = Number(match[1]);
        rows.set(index, { ...rows.get(index), [part.key]: value });
      }
    }
    const ordered = [...rows].sort(([a], [b]) => a - b).map(([, row]) => row).slice(0, MAX_CHOICE_GROUP_ROWS);
    if (ordered.length > 0) result[group.key] = ordered;
  }
  return Object.keys(result).length > 0 ? result : null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads choice fields named `${prefix}-choice-${key}` from a submitted form.
 * Never trusts the client: values outside a field's options are dropped,
 * single-choice fields keep one value, and free text is trimmed and capped
 * (comma-separated when the field allows several). Null when nothing was picked.
 */
export function readChoices(formData: FormData, prefix: string, fields: ScoringCategory[]): Choices | null {
  const result: Choices = {};
  for (const field of fields) {
    let values = formData
      .getAll(`${prefix}-choice-${field.key}`)
      .map((v) => String(v).trim())
      .filter(Boolean);
    if (field.options?.length) {
      values = values.filter((v) => field.options!.includes(v));
    } else {
      if (field.multiple) values = values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
      values = values.map((v) => v.slice(0, MAX_FREE_TEXT_CHOICE_LENGTH));
    }
    values = [...new Set(values)];
    if (!field.multiple) values = values.slice(0, 1);
    if (values.length > 0) result[field.key] = values;
  }
  return Object.keys(result).length > 0 ? result : null;
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
  let total = 0;
  for (const c of contributing) {
    const value = breakdown[c.key];
    if (value === null || value === undefined) return null;
    total += signedCategoryValue(c, value);
  }
  return total;
}

export function hasAnyValue(breakdown: Breakdown): boolean {
  return Object.values(breakdown).some((v) => v !== null && v !== undefined);
}
