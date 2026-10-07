import { BackButton } from "@/components/back-button";
import { searchGames } from "@/lib/actions/search-games";
import { GamesGrid } from "./games-grid";

export default async function GamesPage() {
  const games = await searchGames("", 60);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackHref="/" />
        <h1 className="font-heading text-xl font-semibold">Games</h1>
      </div>

      <GamesGrid initialGames={games} />
    </div>
  );
}
