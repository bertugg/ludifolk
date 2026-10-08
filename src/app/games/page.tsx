import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/back-button";
import { searchGames } from "@/lib/actions/search-games";
import { GamesGrid } from "./games-grid";

export const metadata: Metadata = {
  title: "Browse games | Ludifolk",
  description: "Search the board game catalog on Ludifolk.",
};

export default async function GamesPage() {
  const games = await searchGames("", 60);
  const friendsPlay = await gamesFriendsPlay();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackHref="/" />
        <h1 className="font-heading text-xl font-semibold">Games</h1>
      </div>

      {friendsPlay.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Games your friends play</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {friendsPlay.map((g) => (
              <Link key={g.slug} href={`/games/${g.slug}`} className="w-28 shrink-0">
                <div className="relative aspect-square w-28 overflow-hidden rounded-lg bg-muted">
                  {g.image_url && (
                    <Image src={g.image_url} alt={g.title} fill className="object-cover" sizes="112px" unoptimized />
                  )}
                </div>
                <p className="mt-1 truncate text-xs font-medium">{g.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {g.friendCount} friend{g.friendCount > 1 ? "s" : ""} played
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <GamesGrid initialGames={games} />
    </div>
  );
}

async function gamesFriendsPlay() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const userId = auth.user.id;

  const [{ data: followingRows }, { data: myGameRows }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase
      .from("game_participants")
      .select("session:game_sessions ( game_id )")
      .eq("profile_id", userId)
      .eq("confirmation_status", "confirmed"),
  ]);

  const followingIds = (followingRows ?? []).map((f) => f.following_id);
  const myGameIds = new Set((myGameRows ?? []).map((r) => r.session?.game_id).filter((id): id is string => !!id));
  if (!followingIds.length) return [];

  const { data: friendGameRows } = await supabase
    .from("game_participants")
    .select("profile_id, session:game_sessions ( game_id )")
    .in("profile_id", followingIds)
    .eq("confirmation_status", "confirmed");

  const friendsByGame = new Map<string, Set<string>>();
  for (const r of friendGameRows ?? []) {
    const gameId = r.session?.game_id;
    if (!gameId || !r.profile_id || myGameIds.has(gameId)) continue;
    const set = friendsByGame.get(gameId) ?? new Set<string>();
    set.add(r.profile_id);
    friendsByGame.set(gameId, set);
  }

  const topGameIds = [...friendsByGame.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10)
    .map(([gameId]) => gameId);
  if (!topGameIds.length) return [];

  const { data: gameRows } = await supabase
    .from("games")
    .select("id, slug, title, image_url")
    .in("id", topGameIds);

  return topGameIds
    .map((id) => {
      const game = (gameRows ?? []).find((g) => g.id === id);
      if (!game) return null;
      return { ...game, friendCount: friendsByGame.get(id)!.size };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}
