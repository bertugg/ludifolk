export const SCORING_TYPES = [
  { value: "numeric", label: "Numeric score" },
  { value: "position", label: "Finishing position" },
  { value: "winner_only", label: "Winner only" },
  { value: "cooperative", label: "Cooperative (team win/loss)" },
] as const;

export type ScoringType = (typeof SCORING_TYPES)[number]["value"];

export function scoringTypeLabel(value: string): string {
  return SCORING_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function playerCountLabel(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? `${min} players` : `${min}-${max} players`;
  if (min) return `${min}+ players`;
  if (max) return `Up to ${max} players`;
  return null;
}

export function playtimeLabel(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? `${min} min` : `${min}-${max} min`;
  if (min) return `${min}+ min`;
  if (max) return `Up to ${max} min`;
  return null;
}
