"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { searchGames, type GameSummary } from "@/lib/actions/search-games";

export function GameCombobox({
  id,
  initialGames,
  value,
  onSelect,
}: {
  id?: string;
  initialGames: GameSummary[];
  value: GameSummary | null;
  onSelect: (game: GameSummary | null) => void;
}) {
  const [results, setResults] = useState<GameSummary[]>(initialGames);
  const [isPending, startTransition] = useTransition();

  const items = useMemo(() => {
    if (value && !results.some((g) => g.id === value.id)) {
      return [...results, value];
    }
    return results;
  }, [results, value]);

  return (
    <Combobox
      items={items}
      value={value}
      itemToStringLabel={(game: GameSummary) => game.title}
      isItemEqualToValue={(a: GameSummary, b: GameSummary) => a.id === b.id}
      filter={null}
      onValueChange={(game) => onSelect(game)}
      onInputValueChange={(text) => {
        if (text.trim() === "") {
          setResults(initialGames);
          return;
        }
        startTransition(async () => {
          const found = await searchGames(text);
          setResults(found);
        });
      }}
    >
      <ComboboxInput id={id} placeholder="Search games…" />
      <ComboboxContent>
        <ComboboxEmpty>{isPending ? "Searching…" : "No games found."}</ComboboxEmpty>
        <ComboboxList>
          {(game: GameSummary) => <ComboboxItem key={game.id} value={game}>{game.title}</ComboboxItem>}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
