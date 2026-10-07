import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HeartIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ButtonLink } from "@/components/button-link";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import { participantDisplayName, sessionHeadline, sortParticipants } from "@/lib/session-display";
import { numericStats, percentileRank, performanceLabel } from "@/lib/stats";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";
import { getSessionData } from "./data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getSessionData(id);

  if (!session || !session.game) {
    return { title: "Boardly" };
  }

  const players = sortParticipants(session.participants);
  const winner = players.find((p) => p.is_winner);
  const winnerName = winner && participantDisplayName(winner);
  const headline = sessionHeadline(session.game.scoring_type, session.cooperative_outcome, winnerName);
  const playerNames = players.map((p) => participantDisplayName(p)).join(", ");
  const description = `${session.game.title} with ${playerNames}`;

  return {
    title: `${headline} — ${session.game.title} | Boardly`,
    description,
    openGraph: {
      title: `${headline} — ${session.game.title}`,
      description,
    },
  };
}

export default async function GameSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: comments } = await supabase
    .from("comments")
    .select("id, body, created_at, profile_id, profile:profiles ( username, display_name, avatar_url )")
    .eq("game_session_id", id)
    .order("created_at", { ascending: true });

  const session = await getSessionData(id);

  if (!session || !session.game) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="p-2">
          <BackButton fallbackHref="/" />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            This result doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  const game = session.game;
  const players = sortParticipants(session.participants);
  const winner = players.find((p) => p.is_winner);
  const winnerName = winner && participantDisplayName(winner);
  const playedAt = new Date(session.played_at).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const photoUrls = (
    await Promise.all(
      session.photos.map((p) =>
        supabase.storage.from("session-photos").createSignedUrl(p.storage_path, 3600),
      ),
    )
  )
    .map((r) => r.data?.signedUrl)
    .filter((url): url is string => !!url);

  const myParticipant = session.participants.find(
    (p) => p.profile_id === auth.user?.id && p.confirmation_status === "confirmed",
  );

  let performance: {
    score: number;
    average: number;
    best: number;
    communityAverage: number | null;
    percentile: number;
    label: string;
  } | null = null;

  if (game.scoring_type === "numeric" && myParticipant && myParticipant.score !== null && auth.user) {
    const [{ data: myGameRows }, { data: communityRows }] = await Promise.all([
      supabase
        .from("game_participants")
        .select("score, position, is_winner, session:game_sessions!inner ( game_id )")
        .eq("profile_id", auth.user.id)
        .eq("confirmation_status", "confirmed")
        .eq("session.game_id", game.id)
        .not("score", "is", null),
      supabase
        .from("game_participants")
        .select("score, session:game_sessions!inner ( game_id )")
        .eq("confirmation_status", "confirmed")
        .eq("session.game_id", game.id)
        .not("score", "is", null),
    ]);

    const { averageScore, personalBest } = numericStats(myGameRows ?? []);
    const communityScores = (communityRows ?? []).map((r) => r.score!);
    const communityAverage = communityScores.length
      ? Math.round((communityScores.reduce((a, b) => a + b, 0) / communityScores.length) * 10) / 10
      : null;
    const percentile = percentileRank(myParticipant.score, communityScores);

    performance = {
      score: myParticipant.score,
      average: averageScore ?? myParticipant.score,
      best: personalBest ?? myParticipant.score,
      communityAverage,
      percentile,
      label: performanceLabel(percentile),
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <BackButton fallbackHref={`/games/${game.slug}`} />
        <ShareButton title={`${game.title} — Boardly`} referralSource={`game_session:${session.id}`} />
      </div>

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
        <Link href={`/games/${game.slug}`} className="text-sm text-muted-foreground hover:underline">
          {game.title}
        </Link>
        <h1 className="font-heading text-xl font-semibold">
          {sessionHeadline(game.scoring_type, session.cooperative_outcome, winnerName)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {playedAt}
          {session.location && ` · ${session.location}`}
        </p>
      </div>

      {game.scoring_type === "cooperative" ? (
        <div className="flex items-center gap-2">
          <Badge variant={session.cooperative_outcome === "win" ? "default" : "secondary"}>
            Team {session.cooperative_outcome === "win" ? "won" : "lost"}
          </Badge>
          {session.cooperative_score !== null && (
            <span className="text-sm text-muted-foreground">Score: {session.cooperative_score}</span>
          )}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {players.map((p, i) => {
          const name = participantDisplayName(p);
          return (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <Avatar size="sm">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} alt={name} />
                <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">
                {p.is_winner && "🏆 "}
                {name}
                {p.confirmation_status === "declined" && (
                  <span className="ml-1.5 font-normal text-muted-foreground">(says this wasn&apos;t them)</span>
                )}
              </span>
              {game.scoring_type !== "cooperative" && (
                <span className="text-sm text-muted-foreground">
                  {p.score !== null ? p.score : p.position !== null ? `#${p.position}` : ""}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {performance && (
        <Card className="gap-2 p-4">
          <Badge variant={performance.percentile >= 50 ? "success" : "secondary"} className="w-fit">
            {performance.label}
          </Badge>
          <div className="flex flex-wrap gap-4 pt-1">
            {[
              ["your score", performance.score],
              ["your average", performance.average],
              ["personal best", performance.best],
              ...(performance.communityAverage !== null
                ? [["community avg", performance.communityAverage] as const]
                : []),
              ["percentile", `${performance.percentile}th`],
            ].map(([label, value]) => (
              <div key={label} className="text-center">
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {session.notes && (
        <p className="rounded-lg bg-muted p-3 text-sm italic leading-relaxed">
          &ldquo;{session.notes}&rdquo;
        </p>
      )}

      {photoUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image src={url} alt="" fill className="object-cover" sizes="224px" unoptimized />
            </div>
          ))}
        </div>
      )}

      {auth.user ? (
        <LikeButton
          sessionId={session.id}
          initialCount={session.likes.length}
          initialLiked={session.likes.some((l) => l.profile_id === auth.user!.id)}
        />
      ) : (
        session.likes.length > 0 && (
          <span className="flex w-fit items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
            <HeartIcon className="size-4" />
            {session.likes.length}
          </span>
        )
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {comments && comments.length > 0 && (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => {
              const name = c.profile?.display_name || c.profile?.username || "Unknown";
              return (
                <li key={c.id} className="flex items-start gap-2.5">
                  <Avatar size="sm">
                    <AvatarImage src={c.profile?.avatar_url ?? undefined} alt={name} />
                    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{name}</span> {c.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {c.profile_id === auth.user?.id && <DeleteCommentButton commentId={c.id} />}
                </li>
              );
            })}
          </ul>
        )}

        {auth.user ? (
          <CommentForm sessionId={session.id} />
        ) : (
          <Card className="items-center gap-2 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Join Boardly to like this, comment, and log your own game nights.
            </p>
            <ButtonLink href="/signup" size="sm">
              Join Boardly
            </ButtonLink>
          </Card>
        )}
      </div>
    </div>
  );
}
