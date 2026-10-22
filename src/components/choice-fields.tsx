"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Choices, ScoringCategory } from "@/lib/scoring";

/**
 * Inputs for a game's choice fields (Small World's races, the map played) —
 * what was picked, never part of the score. Fields with options render as
 * toggle chips backed by hidden inputs; fields without options are free
 * text (comma-separated when several values are allowed). Submitted as
 * `${fieldPrefix}-choice-${key}` and validated server-side by readChoices.
 */
export function ChoiceFields({
  fieldPrefix,
  fields,
  values,
  onChange,
}: {
  fieldPrefix: string;
  fields: ScoringCategory[];
  values: Choices;
  onChange: (key: string, values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {fields.map((field) => {
        const name = `${fieldPrefix}-choice-${field.key}`;
        const selected = values[field.key] ?? [];

        if (!field.options?.length) {
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <Label htmlFor={name} className="text-xs font-normal text-muted-foreground" title={field.description}>
                {field.label}
              </Label>
              <Input
                id={name}
                name={name}
                placeholder={field.multiple ? "Separate with commas" : "Optional"}
                value={selected.join(", ")}
                onChange={(e) => onChange(field.key, e.target.value ? [e.target.value] : [])}
              />
            </div>
          );
        }

        function toggle(option: string) {
          if (selected.includes(option)) onChange(field.key, selected.filter((v) => v !== option));
          else onChange(field.key, field.multiple ? [...selected, option] : [option]);
        }

        return (
          <fieldset key={field.key} className="flex flex-col gap-1">
            <legend className="mb-1 text-xs text-muted-foreground" title={field.description}>
              {field.label}
              {field.multiple && " (pick any)"}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <Button
                    key={option}
                    type="button"
                    size="xs"
                    variant={isSelected ? "default" : "outline"}
                    aria-pressed={isSelected}
                    onClick={() => toggle(option)}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
            {selected.map((v) => (
              <input key={v} type="hidden" name={name} value={v} />
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}
