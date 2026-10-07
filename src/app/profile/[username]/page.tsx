import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ButtonLink } from "@/components/button-link";
import { FollowButton } from "@/components/follow-button";
import { ProfileTabs } from "@/components/profile-tabs";
import { basicStats } from "@/lib/stats";

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
