import Image from "next/image";
import Link from "next/link";
import { FlameIcon, Gamepad2Icon, MedalIcon, StarIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ButtonLink } from "@/components/button-link";
import { FollowButton } from "@/components/follow-button";
import { ProfileTabs } from "@/components/profile-tabs";
import { basicStats, headToHeadResult, longestWinStreak } from "@/lib/stats";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, privacy, created_at")
      .eq("username", username)
      .maybeSingle(),
  ]);

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

  const isOwner = auth.user?.id === profile.id;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const [{ data: participations }, { count: followerCount }, { count: followingCount }, { data: viewerFollow }] =
    await Promise.all([
      supabase
        .from("game_participants")
        .select("score, position, is_winner")
        .eq("profile_id", profile.id)
        .eq("confirmation_status", "confirmed"),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      !isOwner && auth.user
        ? supabase
            .from("follows")
            .select("id")
            .eq("follower_id", auth.user.id)
            .eq("following_id", profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const { gamesPlayed, wins, winRate } = basicStats(participations ?? []);

  const { data: myRows } = await supabase
    .from("game_participants")
    .select(
      "session_id, score, position, is_winner, session:game_sessions ( played_at, game:games ( id, title, scoring_type ) )",
    )
    .eq("profile_id", profile.id)
    .eq("confirmation_status", "confirmed");

  const validRows = (myRows ?? []).filter((r) => r.session?.game);
  const sessionIds = validRows.map((r) => r.session_id);

  const { data: opponentRows } = sessionIds.length
    ? await supabase
        .from("game_participants")
        .select(
          "session_id, profile_id, score, position, is_winner, profile:profiles!game_participants_profile_id_fkey ( username, display_name, avatar_url )",
        )
        .in("session_id", sessionIds)
        .eq("confirmation_status", "confirmed")
        .not("profile_id", "is", null)
        .neq("profile_id", profile.id)
    : { data: [] };

  const myBySession = new Map(validRows.map((r) => [r.session_id, r]));
  const rivalsByProfile = new Map<
    string,
    { name: string; avatarUrl: string | null; wins: number; losses: number }
  >();
  const headToHeadByGame = new Map<
    string,
    { opponentName: string; gameTitle: string; wins: number; losses: number }
  >();

  for (const o of opponentRows ?? []) {
    const mine = myBySession.get(o.session_id);
    if (!mine || !o.profile_id) continue;
    const game = mine.session!.game!;
    if (game.scoring_type === "cooperative") continue;

    const result = headToHeadResult(game.scoring_type, mine, o);
    if (!result || result === "tie") continue;

    const opponentName = o.profile?.display_name || o.profile?.username || "Unknown";

    const entry = rivalsByProfile.get(o.profile_id) ?? {
      name: opponentName,
      avatarUrl: o.profile?.avatar_url ?? null,
      wins: 0,
      losses: 0,
    };
    if (result === "win") entry.wins++;
    else entry.losses++;
    rivalsByProfile.set(o.profile_id, entry);

    const gameKey = `${o.profile_id}:${game.id}`;
    const gameEntry = headToHeadByGame.get(gameKey) ?? {
      opponentName,
      gameTitle: game.title,
      wins: 0,
      losses: 0,
    };
    if (result === "win") gameEntry.wins++;
    else gameEntry.losses++;
    headToHeadByGame.set(gameKey, gameEntry);
  }

  const rivals = [...rivalsByProfile.entries()]
    .map(([profileId, r]) => ({ profileId, ...r }))
    .sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
    .slice(0, 5);

  const now = new Date();
  const gamesThisMonth = validRows.filter((r) => {
    const played = new Date(r.session!.played_at);
    return played.getMonth() === now.getMonth() && played.getFullYear() === now.getFullYear();
  }).length;
  const distinctGamesWon = new Set(validRows.filter((r) => r.is_winner).map((r) => r.session!.game!.id)).size;
  const distinctPeoplePlayedWith = new Set((opponentRows ?? []).map((o) => o.profile_id)).size;

  const h2hPairs = [...headToHeadByGame.values()];
  const beatRival =
    h2hPairs.filter((p) => p.wins === 0).sort((a, b) => b.losses - a.losses)[0] ??
    h2hPairs.sort((a, b) => b.wins + b.losses - (a.wins + a.losses))[0] ??
    null;

  const challenges = [
    {
      key: "month",
      title: "Play 5 games this month",
      progress: gamesThisMonth,
      target: 5,
      done: gamesThisMonth >= 5,
    },
    {
      key: "variety",
      title: "Win 3 different games",
      progress: distinctGamesWon,
      target: 3,
      done: distinctGamesWon >= 3,
    },
    {
      key: "social",
      title: "Play with 10 different people",
      progress: distinctPeoplePlayedWith,
      target: 10,
      done: distinctPeoplePlayedWith >= 10,
    },
    ...(beatRival
      ? [
          {
            key: "rival",
            title: `Beat ${beatRival.opponentName} at ${beatRival.gameTitle}`,
            progress: beatRival.wins,
            target: 1,
            done: beatRival.wins > 0,
            detail: `${beatRival.wins}–${beatRival.losses}`,
          },
        ]
      : []),
  ];

  const sortedByDate = [...validRows].sort(
    (a, b) => new Date(a.session!.played_at).getTime() - new Date(b.session!.played_at).getTime(),
  );
  const winStreak = longestWinStreak(sortedByDate);
  const hasPersonalBest = validRows.some((r) => r.score !== null);

  const achievements = [
    { key: "first_game", title: "First Game", icon: Gamepad2Icon, unlocked: gamesPlayed >= 1 },
    { key: "first_win", title: "First Win", icon: TrophyIcon, unlocked: wins >= 1 },
    { key: "streak", title: "Five Wins in a Row", icon: FlameIcon, unlocked: winStreak >= 5 },
    { key: "century", title: "100 Games", icon: MedalIcon, unlocked: gamesPlayed >= 100 },
    { key: "social25", title: "Played With 25 People", icon: UsersIcon, unlocked: distinctPeoplePlayedWith >= 25 },
    { key: "pb", title: "Personal Best", icon: StarIcon, unlocked: hasPersonalBest },
  ];

  const { data: historyRaw } = await supabase
    .from("game_sessions")
    .select(
      `
        id, played_at, cooperative_outcome,
        game:games ( slug, title, image_url, scoring_type ),
        mine:game_participants!inner ( score, position, is_winner, confirmation_status, profile_id )
      `,
    )
    .eq("mine.profile_id", profile.id)
    .eq("mine.confirmation_status", "confirmed")
    .order("played_at", { ascending: false })
    .limit(20);

  const history = (historyRaw ?? [])
    .filter((s) => s.game !== null)
    .map((s) => {
      const mine = s.mine[0];
      return {
        id: s.id,
        playedAt: s.played_at,
        game: s.game!,
        isWinner: mine?.is_winner ?? false,
        score: mine?.score ?? null,
        position: mine?.position ?? null,
        cooperativeOutcome: s.cooperative_outcome,
      };
    });

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2">
        <BackButton fallbackHref="/" />
      </div>
      <div className="flex flex-1 flex-col items-center p-4 pt-0">
        <ProfileTabs
          overview={
            <Card className="w-full">
              <CardContent className="flex flex-col items-center gap-3 text-center">
                <Avatar size="lg" className="size-20">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
                  <AvatarFallback className="text-xl">
                    {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-heading text-xl font-semibold">{profile.display_name || profile.username}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
                {profile.bio && <p className="text-sm">{profile.bio}</p>}

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{followerCount ?? 0}</span> followers ·{" "}
                  <span className="font-medium text-foreground">{followingCount ?? 0}</span> following
                </p>

                {!isOwner &&
                  (auth.user ? (
                    <FollowButton profileId={profile.id} initialFollowing={!!viewerFollow} />
                  ) : (
                    <ButtonLink href="/signup" size="sm">
                      Sign up to follow
                    </ButtonLink>
                  ))}

                {gamesPlayed > 0 && (
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{gamesPlayed}</p>
                      <p className="text-xs text-muted-foreground">games</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{wins}</p>
                      <p className="text-xs text-muted-foreground">wins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{winRate}%</p>
                      <p className="text-xs text-muted-foreground">win rate</p>
                    </div>
                  </div>
                )}

                <div className="flex w-full flex-col gap-1.5 pt-1">
                  <h2 className="text-center text-xs font-semibold text-muted-foreground">Achievements</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {achievements.map((a) => {
                      const Icon = a.icon;
                      return (
                        <div
                          key={a.key}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center ${
                            a.unlocked
                              ? "border-primary/30 bg-primary/5 text-foreground"
                              : "border-border bg-muted/40 text-muted-foreground opacity-60"
                          }`}
                        >
                          <Icon className="size-5" />
                          <span className="text-[11px] leading-tight font-medium">{a.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isOwner && challenges.length > 0 && (
                  <div className="flex w-full flex-col gap-1.5 pt-1 text-left">
                    <h2 className="text-center text-xs font-semibold text-muted-foreground">Challenges</h2>
                    <ul className="flex flex-col gap-1.5">
                      {challenges.map((c) => (
                        <li key={c.key} className="flex items-center gap-2.5 rounded-lg border border-border p-2">
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                              c.done ? "bg-forest text-white" : "bg-border text-muted-foreground"
                            }`}
                          >
                            {c.done ? "✓" : ""}
                          </span>
                          <span className="flex-1 text-sm font-medium">{c.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.detail ?? `${Math.min(c.progress, c.target)}/${c.target}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rivals.length > 0 && (
                  <div className="flex w-full flex-col gap-1.5 pt-1 text-left">
                    <h2 className="text-center text-xs font-semibold text-muted-foreground">Rivals</h2>
                    <ul className="flex flex-col gap-1.5">
                      {rivals.map((r) => (
                        <li
                          key={r.profileId}
                          className="flex items-center gap-2.5 rounded-lg border border-border p-2"
                        >
                          <Avatar size="sm">
                            <AvatarImage src={r.avatarUrl ?? undefined} alt={r.name} />
                            <AvatarFallback>{r.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-sm font-medium">{r.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {r.wins}–{r.losses}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {gamesPlayed > 0 && (
                  <ButtonLink href={`/wrapped/${profile.username}`} size="sm" variant="outline">
                    🎉 View Wrapped
                  </ButtonLink>
                )}

                <p className="text-xs text-muted-foreground">
                  Joined {joined}
                  {profile.privacy === "private" && " · Private profile"}
                </p>
                {isOwner && (
                  <ButtonLink href="/settings/profile" variant="outline" size="sm" className="mt-2">
                    Edit profile
                  </ButtonLink>
                )}
              </CardContent>
            </Card>
          }
          history={
            <div className="flex w-full flex-col gap-1.5 pt-3">
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No games logged yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {history.map((h) => {
                    const date = new Date(h.playedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const outcome =
                      h.game.scoring_type === "cooperative"
                        ? h.cooperativeOutcome === "win"
                          ? "Team won"
                          : "Team lost"
                        : h.isWinner
                          ? "🏆 Won"
                          : h.position !== null
                            ? `#${h.position}`
                            : h.score !== null
                              ? `${h.score} pts`
                              : "Played";
                    return (
                      <li key={h.id}>
                        <Link
                          href={`/game-session/${h.id}`}
                          className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 text-left hover:bg-muted"
                        >
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                            {h.game.image_url && (
                              <Image
                                src={h.game.image_url}
                                alt={h.game.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            )}
                          </div>
                          <div className="flex-1 text-sm">
                            <p className="font-medium">{h.game.title}</p>
                            <p className="text-xs text-muted-foreground">{outcome}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{date}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
