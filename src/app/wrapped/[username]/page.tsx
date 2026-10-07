import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/back-button";
import { ShareButton } from "@/components/share-button";
import {
  basicStats,
  headToHeadResult,
  longestWinStreak,
  percentileRank,
  type StatsRow,
} from "@/lib/stats";

function currentYear(): number {
  return new Date().getFullYear();
}

function yearBounds(year: number) {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

type ValidRow = StatsRow & {
  session_id: string;
  session: { played_at: string; game: { id: string; title: string; scoring_type: string } | null } | null;
};

export default async function WrappedPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const year = currentYear();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="p-2">
          <BackButton fallbackHref="/" />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            This profile doesn&apos;t exist or is private.
          </p>
        </div>
      </div>
    );
  }

  const { start, end } = yearBounds(year);

  const { data: yearRows } = await supabase
    .from("game_participants")
    .select(
      "session_id, score, position, is_winner, session:game_sessions!inner ( played_at, game:games ( id, title, scoring_type ) )",
    )
    .eq("profile_id", profile.id)
    .eq("confirmation_status", "confirmed")
    .gte("session.played_at", start)
    .lt("session.played_at", end);

  const validRows = ((yearRows ?? []) as ValidRow[]).filter((r) => r.session?.game);
  const { gamesPlayed, wins } = basicStats(validRows);

  const sessionIds = validRows.map((r) => r.session_id);
  const { data: opponentRows } = sessionIds.length
    ? await supabase
        .from("game_participants")
        .select(
          "session_id, profile_id, score, position, is_winner, profile:profiles!game_participants_profile_id_fkey ( username, display_name )",
        )
        .in("session_id", sessionIds)
        .eq("confirmation_status", "confirmed")
        .not("profile_id", "is", null)
        .neq("profile_id", profile.id)
    : { data: [] };

  const distinctOpponents = new Set((opponentRows ?? []).map((o) => o.profile_id)).size;

  // Most played + Favorite (best win rate, min 2 plays)
  const statsByGame = new Map<string, { title: string; wins: number; count: number }>();
  for (const r of validRows) {
    const g = r.session!.game!;
    const e = statsByGame.get(g.id) ?? { title: g.title, wins: 0, count: 0 };
    e.count++;
    if (r.is_winner) e.wins++;
    statsByGame.set(g.id, e);
  }
  const mostPlayed = [...statsByGame.values()].sort((a, b) => b.count - a.count)[0] ?? null;
  const favorite =
    [...statsByGame.values()]
      .filter((e) => e.count >= 2)
      .map((e) => ({ ...e, winRate: e.wins / e.count }))
      .sort((a, b) => b.winRate - a.winRate || b.count - a.count)[0] ?? null;

  // Best performance: highest percentile among this year's numeric sessions
  const numericRows = validRows.filter((r) => r.session!.game!.scoring_type === "numeric" && r.score !== null);
  const numericGameIds = [...new Set(numericRows.map((r) => r.session!.game!.id))];
  const communityByGame = new Map<string, number[]>();
  if (numericGameIds.length) {
    const { data: communityRows } = await supabase
      .from("game_participants")
      .select("score, session:game_sessions!inner ( game_id )")
      .eq("confirmation_status", "confirmed")
      .in("session.game_id", numericGameIds)
      .not("score", "is", null);
    for (const r of communityRows ?? []) {
      const gid = r.session?.game_id;
      if (!gid) continue;
      const arr = communityByGame.get(gid) ?? [];
      arr.push(r.score!);
      communityByGame.set(gid, arr);
    }
  }
  let bestPerformance: { title: string; percentile: number } | null = null;
  for (const r of numericRows) {
    const g = r.session!.game!;
    const percentile = percentileRank(r.score!, communityByGame.get(g.id) ?? []);
    if (!bestPerformance || percentile > bestPerformance.percentile) {
      bestPerformance = { title: g.title, percentile };
    }
  }

  // Longest win streak this year
  const sortedByDate = [...validRows].sort(
    (a, b) => new Date(a.session!.played_at).getTime() - new Date(b.session!.played_at).getTime(),
  );
  const winStreak = longestWinStreak(sortedByDate);

  // Nemesis: the opponent with the worst record against them this year
  const myBySession = new Map(validRows.map((r) => [r.session_id, r]));
  const recordByOpponent = new Map<string, { name: string; wins: number; losses: number }>();
  for (const o of opponentRows ?? []) {
    const mine = myBySession.get(o.session_id);
    if (!mine || !o.profile_id) continue;
    const game = mine.session!.game!;
    if (game.scoring_type === "cooperative") continue;
    const result = headToHeadResult(game.scoring_type, mine, o);
    if (!result || result === "tie") continue;
    const name = o.profile?.display_name || o.profile?.username || "Unknown";
    const entry = recordByOpponent.get(o.profile_id) ?? { name, wins: 0, losses: 0 };
    if (result === "win") entry.wins++;
    else entry.losses++;
    recordByOpponent.set(o.profile_id, entry);
  }
  const nemesis =
    [...recordByOpponent.values()]
      .filter((e) => e.losses > 0)
      .sort((a, b) => b.losses - a.losses || a.wins - b.wins)[0] ?? null;

  const name = profile.display_name || profile.username;
  const highlights = [
    mostPlayed && { label: "Most Played", value: mostPlayed.title },
    bestPerformance && { label: "Best Performance", value: `${bestPerformance.title} — ${bestPerformance.percentile}th percentile` },
    winStreak >= 2 && { label: "Longest Win Streak", value: String(winStreak) },
    nemesis && { label: "Nemesis", value: nemesis.name },
    favorite && { label: "Favorite", value: favorite.title },
  ].filter((h): h is { label: string; value: string } => !!h);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <BackButton fallbackHref={`/profile/${profile.username}`} />
        <ShareButton title={`${name}'s ${year} Board Game Year — Boardly`} />
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-gradient-to-br from-terracotta via-terracotta to-forest p-6 text-cream shadow-lg">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">{name}&apos;s</p>
          <h1 className="font-heading text-3xl font-bold leading-tight">{year} Board Game Year</h1>
        </div>

        {gamesPlayed === 0 ? (
          <p className="text-sm opacity-90">No games logged in {year} yet — the year is still young.</p>
        ) : (
          <>
            <div className="flex gap-6">
              <div>
                <p className="font-heading text-3xl font-bold">{gamesPlayed}</p>
                <p className="text-xs opacity-80">games</p>
              </div>
              <div>
                <p className="font-heading text-3xl font-bold">{wins}</p>
                <p className="text-xs opacity-80">wins</p>
              </div>
              <div>
                <p className="font-heading text-3xl font-bold">{distinctOpponents}</p>
                <p className="text-xs opacity-80">opponents</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {highlights.map((h) => (
                <div key={h.label} className="rounded-xl bg-cream/10 p-3">
                  <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{h.label}</p>
                  <p className="font-heading text-lg font-semibold">{h.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
