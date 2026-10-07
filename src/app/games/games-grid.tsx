"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { playerCountLabel, playtimeLabel } from "@/lib/games";
import { searchGames, type GameSummary } from "@/lib/actions/search-games";

export function GamesGrid({ initialGames }: { initialGames: GameSummary[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSummary[]>(initialGames);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim() === "") {
      setResults(initialGames);
      return;
    }
    startTransition(async () => {
      setResults(await searchGames(value, 24));
    });
  }

  return (
    <>
      <Input
        placeholder="Search games…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />

      {!isPending && results.length === 0 && (
        <Card className="items-center p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {query ? `No games match "${query}".` : "No games in the catalog yet."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {results.map((game) => {
          const players = playerCountLabel(game.min_players, game.max_players);
          const playtime = playtimeLabel(game.playtime_minutes_min, game.playtime_minutes_max);
          return (
            <Link key={game.slug} href={`/games/${game.slug}`}>
              <Card className="gap-2 overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="relative aspect-square w-full bg-muted">
                  {game.image_url && (
                    <Image
                      src={game.image_url}
                      alt={game.title}
                      fill
                      className="object-cover"
                      sizes="200px"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex flex-col gap-0.5 px-3 pb-3">
                  <p className="truncate text-sm font-medium">{game.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[players, playtime].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
