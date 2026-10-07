import Image from "next/image";
import Link from "next/link";
import { CrownIcon, MessageCircleIcon, ShieldCheckIcon, XCircleIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import {
  participantDisplayName,
  relativeTime,
  sortParticipants,
  type ParticipantForDisplay,
} from "@/lib/session-display";

export type FeedItem = {
  id: string;
  createdAt: string;
  actorName: string;
  actorAvatarUrl: string | null;
  session: {
    id: string;
    playedAt: string;
    location: string | null;
    cooperativeOutcome: string | null;
    cooperativeScore: number | null;
    notes: string | null;
    game: { slug: string; title: string; imageUrl: string | null; scoringType: string };
    participants: ParticipantForDisplay[];
    likeCount: number;
    likedByMe: boolean;
    commentCount: number;
  };
};

function MiniAvatar({ p }: { p: ParticipantForDisplay }) {
  const name = participantDisplayName(p);
  return (
    <Avatar size="sm" className="size-5">
      <AvatarImage src={p.profile?.avatar_url ?? undefined} alt={name} />
      <AvatarFallback className="text-[10px]">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function FeedCard({ item }: { item: FeedItem }) {
  const { session } = item;
  const isCooperative = session.game.scoringType === "cooperative";
  const players = sortParticipants(session.participants);
  const winner = players.find((p) => p.is_winner);
  const otherPlayers = winner ? players.filter((p) => p !== winner) : players;
  const sessionPath = `/game-session/${session.id}`;

  return (
    <Card className="gap-3 pb-3">
      <Link href={sessionPath} className="flex flex-col gap-3">
        <div className="flex items-start justify-between px-4">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={item.actorAvatarUrl ?? undefined} alt={item.actorName} />
              <AvatarFallback>{item.actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm">
                <span className="font-medium text-foreground">
                  {item.actorName}
                  {players.length > 1 && `+${players.length - 1}`}
                </span>{" "}
                <span className="text-muted-foreground">played {session.game.title}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {relativeTime(item.createdAt)}
                {session.location && ` · ${session.location}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-4">
          <div className="relative aspect-3/4 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
            {session.game.imageUrl && (
              <Image
                src={session.game.imageUrl}
                alt={session.game.title}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            {isCooperative ? (
              <>
                <Badge
                  variant={session.cooperativeOutcome === "win" ? "success" : "secondary"}
                  className="w-fit gap-1"
                >
                  {session.cooperativeOutcome === "win" ? (
                    <ShieldCheckIcon className="size-3" />
                  ) : (
                    <XCircleIcon className="size-3" />
                  )}
                  Mission {session.cooperativeOutcome === "win" ? "Success" : "Failed"}
                </Badge>
                {session.cooperativeScore !== null && (
                  <p className="font-heading text-3xl font-bold leading-none">
                    {session.cooperativeScore}
                  </p>
                )}
                <div className="mt-1 flex -space-x-2">
                  {players.slice(0, 5).map((p, i) => (
                    <Avatar key={i} size="sm" className="ring-2 ring-card">
                      <AvatarImage src={p.profile?.avatar_url ?? undefined} alt={participantDisplayName(p)} />
                      <AvatarFallback>{participantDisplayName(p).slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </>
            ) : (
              <>
                {winner && (
                  <>
                    <Badge className="w-fit gap-1">
                      <CrownIcon className="size-3" />
                      Winner
                    </Badge>
                    <p className="font-heading text-base font-semibold">{participantDisplayName(winner)}</p>
                    {winner.score !== null && (
                      <p className="flex items-baseline gap-1">
                        <span className="font-heading text-3xl font-bold leading-none text-primary">
                          {winner.score}
                        </span>
                        <span className="text-xs text-muted-foreground">points</span>
                      </p>
                    )}
                  </>
                )}
                <ul className="mt-0.5 flex flex-col gap-1 text-sm text-muted-foreground">
                  {otherPlayers.map((p, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <MiniAvatar p={p} />
                      {participantDisplayName(p)}
                      {p.score !== null && ` — ${p.score}`}
                      {p.position !== null && ` — #${p.position}`}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {session.notes && (
          <p className="px-4 text-sm italic text-muted-foreground">&ldquo;{session.notes}&rdquo;</p>
        )}
      </Link>

      <div className="-mt-1 flex items-center gap-1 px-2.5">
        <LikeButton sessionId={session.id} initialLiked={session.likedByMe} initialCount={session.likeCount} />
        <span className="flex items-center gap-1 px-2.5 text-sm text-muted-foreground">
          <MessageCircleIcon className="size-4" />
          {session.commentCount > 0 && session.commentCount}
        </span>
        <div className="ml-auto">
          <ShareButton title={`${session.game.title} — Boardly`} path={sessionPath} variant="ghost" iconOnly />
        </div>
      </div>
    </Card>
  );
}
