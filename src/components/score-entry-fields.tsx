"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeCategoryTotal, type ScoringCategory } from "@/lib/scoring";

/**
 * Labeled numeric inputs for a game's scoring categories (Wingspan's
 * "Birds", "Eggs", etc., or a cooperative game's team-level "Outbreaks").
 * Shared between the log form and the edit form so the entry experience
 * (and the total-calculation rule) only exists in one place.
 */
export function ScoreEntryFields({
  fieldPrefix,
  categories,
  values,
  onChange,
}: {
  fieldPrefix: string;
  categories: ScoringCategory[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const numericValues = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v.trim() ? Number(v) : null]),
  );
  const total = computeCategoryTotal(numericValues, categories);
  const hasContributingCategories = categories.some((c) => c.contributesToTotal);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {categories.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-3">
          <Label htmlFor={`${fieldPrefix}-cat-${c.key}`} className="text-sm font-normal" title={c.description}>
            {c.label}
          </Label>
          <Input
            id={`${fieldPrefix}-cat-${c.key}`}
            name={`${fieldPrefix}-cat-${c.key}`}
            type="number"
            inputMode="numeric"
            placeholder="—"
            value={values[c.key] ?? ""}
            onChange={(e) => onChange(c.key, e.target.value)}
            className="w-20 text-right"
          />
        </div>
      ))}
      {hasContributingCategories && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
          <span className="text-sm font-medium">Total</span>
          <span className="w-20 text-right text-base font-semibold tabular-nums">
            {total !== null ? total : "—"}
          </span>
        </div>
      )}
    </div>
  );
}
