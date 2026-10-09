import Image from "next/image";
import Link from "next/link";
import { CircleCheckIcon, CircleXIcon, CrownIcon, MessageSquareIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/like-button";
import { MentionText } from "@/components/mention-text";
import { PhotoGallery } from "@/components/photo-gallery";
import { ShareButton } from "@/components/share-button";
import {
  participantDisplayName,
  relativeTime,
  sortParticipants,
  type ParticipantForDisplay,
} from "@/lib/session-display";
import { cn } from "@/lib/utils";

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
    /** Signed thumbnail URLs, in upload order. */
    photoUrls: string[];
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
  const won = session.cooperativeOutcome === "win";

  return (
    <article className="flex flex-col gap-3 py-4">
      <Link href={sessionPath} className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-4">
          <Avatar size="lg">
            <AvatarImage src={item.actorAvatarUrl ?? undefined} alt={item.actorName} />
            <AvatarFallback>{item.actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-heading text-[15px] leading-snug text-foreground">
              <span className="font-semibold">
                {item.actorName}
                {players.length > 1 && `+${players.length - 1}`}
              </span>{" "}
              <span className="text-foreground/80">played</span>{" "}
              <span className="font-semibold">{session.game.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {relativeTime(item.createdAt)}
              {session.location && ` · ${session.location}`}
            </p>
          </div>
        </div>

        <div className="flex items-stretch gap-3 px-4">
          <div className="relative aspect-square w-[44%] shrink-0 self-start overflow-hidden rounded-xl bg-muted shadow-sm">
            {session.game.imageUrl && (
              <Image
                src={session.game.imageUrl}
                alt={session.game.title}
                fill
                className="object-cover"
                sizes="180px"
                unoptimized
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/5">
            {isCooperative ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    won ? "bg-forest/10 text-forest" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {won ? <CircleCheckIcon className="size-3.5" /> : <CircleXIcon className="size-3.5" />}
                  Mission {won ? "Success" : "Failed"}
                </span>
                {session.cooperativeScore !== null && (
                  <p className="text-4xl font-bold leading-none tracking-tight text-foreground">
                    {session.cooperativeScore}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {players.slice(0, 5).map((p, i) => (
                    <Avatar key={i} className="size-7">
                      <AvatarImage src={p.profile?.avatar_url ?? undefined} alt={participantDisplayName(p)} />
                      <AvatarFallback className="text-xs">
                        {participantDisplayName(p).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {winner && (
                  <div className="flex flex-col gap-1 pb-2">
                    <span className="flex w-fit items-center gap-1.5 rounded-xl bg-peach px-3 py-1 text-xs font-medium text-primary">
                      <CrownIcon className="size-3.5 fill-gold text-gold" />
                      Winner
                    </span>
                    <p className="truncate px-3 pt-1 text-sm font-semibold text-foreground">
                      {participantDisplayName(winner)}
                    </p>
                    {winner.score !== null && (
                      <p className="flex items-baseline gap-1.5 px-3">
                        <span className="text-4xl font-bold leading-none tracking-tight text-foreground">
                          {winner.score}
                        </span>
                        <span className="text-xs text-muted-foreground">points</span>
                      </p>
                    )}
                  </div>
                )}
                {otherPlayers.length > 0 && (
                  <ul
                    className={cn(
                      "flex flex-col divide-y divide-border/60 text-sm",
                      winner && "border-t border-border/60",
                    )}
                  >
                    {otherPlayers.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                        <MiniAvatar p={p} />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {participantDisplayName(p)}
                        </span>
                        {(p.score !== null || p.position !== null) && (
                          <span className="font-semibold tabular-nums text-foreground">
                            {p.score !== null ? p.score : `#${p.position}`}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Outside the card link: notes can contain @tag links, and links can't nest. */}
      {session.notes && (
        <p className="px-4 font-heading text-[15px] italic text-foreground/90">
          &ldquo;<MentionText text={session.notes} />&rdquo;
        </p>
      )}

      {session.photoUrls.length > 0 && (
        <div className="px-4">
          <PhotoGallery urls={session.photoUrls} variant="strip" />
        </div>
      )}

      <div className="-mt-1 flex items-center gap-1 px-2.5 text-foreground">
        <LikeButton sessionId={session.id} initialLiked={session.likedByMe} initialCount={session.likeCount} />
        <span className="flex items-center gap-1.5 px-2.5 text-sm">
          <MessageSquareIcon className="size-4" />
          {session.commentCount > 0 && session.commentCount}
        </span>
        <div className="ml-auto">
          <ShareButton
            title={`${session.game.title} — Ludifolk`}
            path={sessionPath}
            referralSource={`game_session:${session.id}`}
            variant="ghost"
            iconOnly
          />
        </div>
      </div>
    </article>
  );
}
