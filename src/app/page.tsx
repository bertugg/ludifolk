import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BellIcon, LogOutIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { Card } from "@/components/ui/card";
import { FeedCard, type FeedItem } from "@/components/feed-card";
import { FeedTabs } from "@/components/feed-tabs";
import type { ParticipantForDisplay } from "@/lib/session-display";
import { sessionPhotoUrls, signFeedPhotos } from "@/lib/feed-photos";
import { hasPlaceholderUsername } from "@/lib/username";
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
    comments ( id ),
    photos ( storage_path, created_at )
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
    photos: { storage_path: string; created_at: string }[];
  } | null;
};

function toFeedItems(
  rows: ActivityRow[],
  userId: string,
  scope: "own" | "following",
  photoUrls: Map<string, string>,
): FeedItem[] {
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
        photoUrls: sessionPhotoUrls(a.session!.photos, photoUrls),
      },
    }));
}

function daysAgoIsoDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function FeedList({ items, emptyTitle, emptyCta }: { items: FeedItem[]; emptyTitle: string; emptyCta?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      {items.length === 0 ? (
        <Card className="m-4 items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyTitle}</p>
          {emptyCta}
        </Card>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
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

  const [{ data: profile }, { count: pendingCount }, { data: activitiesRaw }, { data: followingRows }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId)
      .eq("is_read", false),
    supabase.from("activities").select(ACTIVITY_SELECT).order("created_at", { ascending: false }).limit(20),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
  ]);

  // New accounts (including ones arriving from the email confirmation link)
  // pick a username before anything else.
  if (profile && hasPlaceholderUsername(userId, profile.username)) {
    redirect("/welcome");
  }

  const activities = (activitiesRaw ?? []) as unknown as ActivityRow[];

  const followingIds = (followingRows ?? []).map((f) => f.following_id);
  const { data: friendsActivitiesRaw } = followingIds.length
    ? await supabase
        .from("activities")
        .select(ACTIVITY_SELECT)
        .in("profile_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const friendsActivities = (friendsActivitiesRaw ?? []) as unknown as ActivityRow[];

  const { data: myGroupRows } = await supabase.from("group_members").select("group_id").eq("profile_id", userId);
  const myGroupIds = (myGroupRows ?? []).map((g) => g.group_id);
  const trendingWindowStart = daysAgoIsoDate(14);

  const { data: groupSessionsRaw } = myGroupIds.length
    ? await supabase
        .from("game_sessions")
        .select(
          `
            id, created_at, played_at, location, notes, cooperative_outcome, cooperative_score,
            creator:profiles!game_sessions_created_by_fkey ( username, display_name, avatar_url ),
            game:games ( slug, title, image_url, scoring_type ),
            participants:game_participants (
              guest_name, score, position, is_winner, confirmation_status, profile_id,
              profile:profiles!game_participants_profile_id_fkey ( username, display_name, avatar_url )
            ),
            likes ( profile_id ),
            comments ( id ),
            photos ( storage_path, created_at )
          `,
        )
        .in("group_id", myGroupIds)
        .gte("played_at", trendingWindowStart)
    : { data: [] };

  const photoUrls = await signFeedPhotos(supabase, [
    ...new Set([
      ...[...activities, ...friendsActivities].flatMap((a) => a.session?.photos.map((p) => p.storage_path) ?? []),
      ...(groupSessionsRaw ?? []).flatMap((s) => s.photos.map((p) => p.storage_path)),
    ]),
  ]);

  const forYouFeed = toFeedItems(activities, userId, "own", photoUrls);
  const friendsFeed = toFeedItems(friendsActivities, userId, "following", photoUrls);

  const groupsFeed: FeedItem[] = (groupSessionsRaw ?? [])
    .filter((s) => s.game !== null)
    .map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      actorName: s.creator?.display_name || s.creator?.username || "Someone",
      actorAvatarUrl: s.creator?.avatar_url ?? null,
      session: {
        id: s.id,
        playedAt: s.played_at,
        location: s.location,
        notes: s.notes,
        cooperativeOutcome: s.cooperative_outcome,
        cooperativeScore: s.cooperative_score,
        game: {
          slug: s.game!.slug,
          title: s.game!.title,
          imageUrl: s.game!.image_url,
          scoringType: s.game!.scoring_type,
        },
        participants: s.participants,
        likeCount: s.likes.length,
        likedByMe: s.likes.some((l) => l.profile_id === userId),
        commentCount: s.comments.length,
        photoUrls: sessionPhotoUrls(s.photos, photoUrls),
      },
    }))
    .sort((a, b) => {
      const engagementA = a.session.likeCount + a.session.commentCount;
      const engagementB = b.session.likeCount + b.session.commentCount;
      if (engagementB !== engagementA) return engagementB - engagementA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 20);

  // The same session can surface in several feeds (e.g. a friend's game in
  // one of your groups) — keep the first occurrence, newest first.
  const seenSessionIds = new Set<string>();
  const allFeed = [...forYouFeed, ...friendsFeed, ...groupsFeed]
    .filter((item) => {
      if (seenSessionIds.has(item.session.id)) return false;
      seenSessionIds.add(item.session.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="font-heading text-[26px] font-bold tracking-tight text-foreground">Ludifolk</h1>
        <div className="flex items-center gap-1">
          <ButtonLink href="/games" variant="ghost" size="icon" aria-label="Search games">
            <SearchIcon className="size-[22px]" />
          </ButtonLink>
          <ButtonLink href="/discover" variant="ghost" size="icon" aria-label="Discover people">
            <UserPlusIcon className="size-[22px]" />
          </ButtonLink>
          <ButtonLink
            href="/notifications"
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <BellIcon className="size-[22px]" />
            {!!pendingCount && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </ButtonLink>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Log out">
              <LogOutIcon className="size-[22px]" />
            </Button>
          </form>
        </div>
      </header>

      <FeedTabs
        all={
          <FeedList
            items={allFeed}
            emptyTitle="Your table is empty."
            emptyCta={<ButtonLink href="/log" size="sm">Log a game</ButtonLink>}
          />
        }
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
        groups={
          <FeedList
            items={groupsFeed}
            emptyTitle={
              myGroupIds.length === 0
                ? "Join a group to see what's trending there."
                : "No recent activity in your groups yet."
            }
          />
        }
      />
    </div>
  );
}
