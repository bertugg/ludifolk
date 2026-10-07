import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BellIcon, LogOutIcon, SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { Card } from "@/components/ui/card";
import { FeedCard, type FeedItem } from "@/components/feed-card";
import { FeedTabs } from "@/components/feed-tabs";
import type { ParticipantForDisplay } from "@/lib/session-display";
import { signOut } from "./actions";

const ACTIVITY_SELECT = `
  id, created_at, profile_id,
  actor:profiles ( username, display_name, avatar_url ),
  session:game_sessions (
    id, played_at, location, notes, cooperative_outcome, cooperative_score,
    game:games ( slug, title, image_url, scoring_type ),
    participants:game_participants (
      guest_name, score, position, is_winner, confirmation_status, profile_id,
      profile:profiles!game_participants_profile_id_fkey ( username, display_name, avatar_url )
    ),
    likes ( profile_id ),
    comments ( id )
  )
`;

type ActivityRow = {
  id: string;
  created_at: string;
  profile_id: string;
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null;
  session: {
    id: string;
    played_at: string;
    location: string | null;
    notes: string | null;
    cooperative_outcome: string | null;
    cooperative_score: number | null;
    game: { slug: string; title: string; image_url: string | null; scoring_type: string } | null;
    participants: (ParticipantForDisplay & { profile_id: string | null })[];
    likes: { profile_id: string }[];
    comments: { id: string }[];
  } | null;
};

function toFeedItems(rows: ActivityRow[], userId: string, scope: "own" | "following"): FeedItem[] {
  return rows
    .filter((a) => a.session && a.session.game)
    .filter((a) => {
      const mine = a.session!.participants.find((p) => p.profile_id === userId);
      if (mine && mine.confirmation_status === "declined") return false;
      // "own" scope relies on RLS for access control, which also lets through
      // anyone's *public* sessions — restrict explicitly to sessions this
      // viewer actually logged or played in, so a stranger's public game
      // night doesn't show up in "For You".
      if (scope === "own") return a.profile_id === userId || !!mine;
      return true;
    })
    .map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      actorName: a.actor?.display_name || a.actor?.username || "Someone",
      actorAvatarUrl: a.actor?.avatar_url ?? null,
      session: {
        id: a.session!.id,
        playedAt: a.session!.played_at,
        location: a.session!.location,
        notes: a.session!.notes,
        cooperativeOutcome: a.session!.cooperative_outcome,
        cooperativeScore: a.session!.cooperative_score,
        game: {
          slug: a.session!.game!.slug,
          title: a.session!.game!.title,
          imageUrl: a.session!.game!.image_url,
          scoringType: a.session!.game!.scoring_type,
        },
        participants: a.session!.participants,
        likeCount: a.session!.likes.length,
        likedByMe: a.session!.likes.some((l) => l.profile_id === userId),
        commentCount: a.session!.comments.length,
      },
    }));
}

function FeedList({ items, emptyTitle, emptyCta }: { items: FeedItem[]; emptyTitle: string; emptyCta?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-4">
      {items.length === 0 ? (
        <Card className="items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyTitle}</p>
          {emptyCta}
        </Card>
      ) : (
        items.map((item) => <FeedCard key={item.id} item={item} />)
      )}
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }
  const userId = data.user.id;

  const [{ count: pendingCount }, { data: activitiesRaw }, { data: followingRows }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId)
      .eq("is_read", false),
    supabase.from("activities").select(ACTIVITY_SELECT).order("created_at", { ascending: false }).limit(20),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
  ]);

  const forYouFeed = toFeedItems((activitiesRaw ?? []) as unknown as ActivityRow[], userId, "own");

  const followingIds = (followingRows ?? []).map((f) => f.following_id);
  const { data: friendsActivitiesRaw } = followingIds.length
    ? await supabase
        .from("activities")
        .select(ACTIVITY_SELECT)
        .in("profile_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const friendsFeed = toFeedItems((friendsActivitiesRaw ?? []) as unknown as ActivityRow[], userId, "following");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Boardly</h1>
        <div className="flex items-center gap-1">
          <ButtonLink href="/games" variant="ghost" size="icon" aria-label="Search games">
            <SearchIcon className="size-5" />
          </ButtonLink>
          <ButtonLink
            href="/notifications"
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <BellIcon className="size-5" />
            {!!pendingCount && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </ButtonLink>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Log out">
              <LogOutIcon className="size-5" />
            </Button>
          </form>
        </div>
      </header>

      <FeedTabs
        forYou={<FeedList items={forYouFeed} emptyTitle="Your table is empty." emptyCta={<ButtonLink href="/log" size="sm">Log a game</ButtonLink>} />}
        friends={
          <FeedList
            items={friendsFeed}
            emptyTitle={
              followingIds.length === 0
                ? "You're not following anyone yet."
                : "No activity from people you follow yet."
            }
          />
        }
      />
    </div>
  );
}
