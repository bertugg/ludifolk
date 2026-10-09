import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { AppHomeLink } from "@/components/app-home-link";
import { playerCountLabel, playtimeLabel, scoringTypeLabel } from "@/lib/games";
import { basicStats, numericStats, positionStats } from "@/lib/stats";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("title, description, image_url, publisher, year_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!game) return { title: "Ludifolk" };

  const description =
    game.description || [game.publisher, game.year_published].filter(Boolean).join(" · ") || "On Ludifolk.";

  return {
    title: `${game.title} | Ludifolk`,
    description,
    openGraph: {
      title: game.title,
      description,
      images: game.image_url ? [game.image_url] : [],
    },
  };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("slug", slug).maybeSingle();

  if (!game) {
    notFound();
  }

  const { data: auth } = await supabase.auth.getUser();
  let myStats: { score: number | null; position: number | null; is_winner: boolean }[] | null = null;
  if (auth.user) {
    const { data: gameSessionIds } = await supabase.from("game_sessions").select("id").eq("game_id", game.id);
    const ids = (gameSessionIds ?? []).map((s) => s.id);
    const { data: myRows } = ids.length
      ? await supabase
          .from("game_participants")
          .select("score, position, is_winner")
          .eq("profile_id", auth.user.id)
          .eq("confirmation_status", "confirmed")
          .in("session_id", ids)
      : { data: [] };
    myStats = myRows ?? [];
  }

  const { data: recentSessions } = await supabase
    .from("game_sessions")
    .select(
      `
        id, played_at, cooperative_outcome,
        participants:game_participants (
          guest_name, is_winner,
          profile:profiles!game_participants_profile_id_fkey ( username, display_name )
        )
      `,
    )
    .eq("game_id", game.id)
    .order("played_at", { ascending: false })
    .limit(5);

  const players = playerCountLabel(game.min_players, game.max_players);
  const playtime = playtimeLabel(game.playtime_minutes_min, game.playtime_minutes_max);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <AppHomeLink />
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-muted">
        {game.image_url && (
          <Image
            src={game.image_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="672px"
            unoptimized
          />
        )}
      </div>

      <div>
        <h1 className="font-heading text-xl font-semibold">{game.title}</h1>
        <p className="text-sm text-muted-foreground">
          {[game.publisher, game.year_published].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {players && <span>{players}</span>}
        {players && playtime && <span>·</span>}
        {playtime && <span>{playtime}</span>}
        {(players || playtime) && <span>·</span>}
        <span>{scoringTypeLabel(game.scoring_type)}</span>
      </div>

      {(game.categories.length > 0 || game.mechanics.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {game.categories.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
          {game.mechanics.map((m) => (
            <Badge key={m} variant="outline">
              {m}
            </Badge>
          ))}
        </div>
      )}

      {game.description && <p className="text-sm leading-relaxed">{game.description}</p>}

      {myStats && myStats.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Your stats</h2>
          <div className="flex flex-wrap gap-4 rounded-lg border border-border p-3">
            {(() => {
              const { gamesPlayed, wins, winRate } = basicStats(myStats);
              const stat = (label: string, value: string | number) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              );
              const items = [
                stat("games", gamesPlayed),
                stat("wins", wins),
                stat("win rate", `${winRate}%`),
              ];
              if (game.scoring_type === "numeric") {
                const { averageScore, personalBest } = numericStats(myStats);
                if (averageScore !== null) items.push(stat("average score", averageScore));
                if (personalBest !== null) items.push(stat("personal best", personalBest));
              } else if (game.scoring_type === "position") {
                const { averagePosition } = positionStats(myStats);
                if (averagePosition !== null) items.push(stat("average position", averagePosition));
              }
              return items;
            })()}
          </div>
        </div>
      )}

      {recentSessions && recentSessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent sessions</h2>
          <ul className="flex flex-col gap-1.5">
            {recentSessions.map((s) => {
              const winner = s.participants.find((p) => p.is_winner);
              const winnerName = winner?.profile?.display_name || winner?.profile?.username || winner?.guest_name;
              const date = new Date(s.played_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <li key={s.id}>
                  <Link
                    href={`/game-session/${s.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm hover:bg-muted"
                  >
                    <span>
                      {game.scoring_type === "cooperative"
                        ? `Team ${s.cooperative_outcome === "win" ? "won" : "lost"}`
                        : winnerName
                          ? `🏆 ${winnerName}`
                          : "Logged"}
                    </span>
                    <span className="text-muted-foreground">{date}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
