"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { ChoiceGroup, ChoiceGroups, ChoiceRow } from "@/lib/scoring";

/**
 * Repeatable rows for a game's choice groups — Small World's race + special
 * power, one row per combo. Each part is a searchable combobox (free text
 * when it has no options); the trash button removes the row. Submitted as
 * `${fieldPrefix}-group-${group}-${row}-${field}` and validated server-side
 * by readChoiceGroups.
 */
export function ChoiceGroupFields({
  fieldPrefix,
  groups,
  values,
  onChange,
}: {
  fieldPrefix: string;
  groups: ChoiceGroup[];
  values: ChoiceGroups;
  onChange: (groupKey: string, rows: ChoiceRow[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <GroupRows
          key={group.key}
          fieldPrefix={fieldPrefix}
          group={group}
          rows={values[group.key] ?? []}
          onChange={(rows) => onChange(group.key, rows)}
        />
      ))}
    </div>
  );
}

function GroupRows({
  fieldPrefix,
  group,
  rows,
  onChange,
}: {
  fieldPrefix: string;
  group: ChoiceGroup;
  rows: ChoiceRow[];
  onChange: (rows: ChoiceRow[]) => void;
}) {
  // Stable React keys, so removing a middle row doesn't shift another row's
  // combobox state into its place. Rows only change through this component.
  const [rowIds, setRowIds] = useState(() => rows.map(() => crypto.randomUUID()));

  function addRow() {
    setRowIds((ids) => [...ids, crypto.randomUUID()]);
    onChange([...rows, {}]);
  }

  function removeRow(index: number) {
    setRowIds((ids) => ids.filter((_, i) => i !== index));
    onChange(rows.filter((_, i) => i !== index));
  }

  function setPart(index: number, partKey: string, value: string) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [partKey]: value } : row)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length > 0 && <Label className="text-xs font-normal text-muted-foreground">{group.label}</Label>}
      {rows.map((row, index) => (
        <div key={rowIds[index]} className="flex items-center gap-1.5">
          {group.parts.map((part) => {
            const name = `${fieldPrefix}-group-${group.key}-${index}-${part.key}`;
            const value = row[part.key] ?? "";
            return (
              <div key={part.key} className="min-w-0 flex-1">
                {part.options?.length ? (
                  <Combobox
                    items={part.options}
                    value={value || null}
                    onValueChange={(v) => setPart(index, part.key, v ?? "")}
                  >
                    <ComboboxInput placeholder={part.label} aria-label={part.label} className="w-full" />
                    <ComboboxContent>
                      <ComboboxEmpty>No match.</ComboboxEmpty>
                      <ComboboxList>
                        {(option: string) => (
                          <ComboboxItem key={option} value={option}>
                            {option}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                ) : (
                  <Input
                    placeholder={part.label}
                    aria-label={part.label}
                    value={value}
                    onChange={(e) => setPart(index, part.key, e.target.value)}
                  />
                )}
                <input type="hidden" name={name} value={value} />
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRow(index)}
            aria-label={`Remove ${group.label}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
        <PlusIcon />
        Add {group.label}
      </Button>
    </div>
  );
}
