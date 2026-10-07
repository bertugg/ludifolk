import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { FollowButton } from "@/components/follow-button";

type Candidate = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }
  const userId = auth.user.id;

  if (query) {
    const { data: results } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .neq("id", userId)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    const { data: alreadyFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    const followingSet = new Set((alreadyFollowing ?? []).map((f) => f.following_id));

    return (
      <DiscoverLayout query={query}>
        {!results?.length ? (
          <Card className="items-center gap-2 p-8 text-center">
            <p className="text-sm text-muted-foreground">No one found for &ldquo;{query}&rdquo;.</p>
          </Card>
        ) : (
          <PersonList people={results} reasons={new Map()} followingSet={followingSet} />
        )}
      </DiscoverLayout>
    );
  }

  const [{ data: myGameRows }, { data: myFollowingRows }] = await Promise.all([
    supabase
      .from("game_participants")
      .select("session:game_sessions ( game_id )")
      .eq("profile_id", userId)
      .eq("confirmation_status", "confirmed"),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
  ]);

  const myGameIds = new Set((myGameRows ?? []).map((r) => r.session?.game_id).filter((id): id is string => !!id));
  const followingSet = new Set((myFollowingRows ?? []).map((r) => r.following_id));

  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  const pool = (candidates ?? []).filter((c) => !followingSet.has(c.id));
  const candidateIds = pool.map((c) => c.id);

  const [{ data: candidateGameRows }, { data: sharedGroupRows }, { data: candidateFollowerRows }] = candidateIds.length
    ? await Promise.all([
        supabase
          .from("game_participants")
          .select("profile_id, session:game_sessions ( game_id )")
          .in("profile_id", candidateIds)
          .eq("confirmation_status", "confirmed"),
        supabase
          .from("group_members")
          .select("profile_id, group:groups ( name )")
          .in("profile_id", candidateIds),
        supabase.from("follows").select("follower_id, following_id").in("following_id", candidateIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const overlapByCandidate = new Map<string, Set<string>>();
  for (const r of candidateGameRows ?? []) {
    const gameId = r.session?.game_id;
    if (!r.profile_id || !gameId || !myGameIds.has(gameId)) continue;
    const set = overlapByCandidate.get(r.profile_id) ?? new Set<string>();
    set.add(gameId);
    overlapByCandidate.set(r.profile_id, set);
  }

  // RLS on group_members only returns rows for groups the viewer is
  // already a member of, so every row here is already a shared group.
  const sharedGroupsByCandidate = new Map<string, string[]>();
  for (const r of sharedGroupRows ?? []) {
    if (!r.profile_id || !r.group?.name) continue;
    const arr = sharedGroupsByCandidate.get(r.profile_id) ?? [];
    arr.push(r.group.name);
    sharedGroupsByCandidate.set(r.profile_id, arr);
  }

  const mutualFriendsByCandidate = new Map<string, number>();
  for (const r of candidateFollowerRows ?? []) {
    if (!r.following_id || !followingSet.has(r.follower_id)) continue;
    mutualFriendsByCandidate.set(r.following_id, (mutualFriendsByCandidate.get(r.following_id) ?? 0) + 1);
  }

  const reasons = new Map<string, string>();
  const scored = pool
    .map((c) => {
      const overlappingGames = overlapByCandidate.get(c.id)?.size ?? 0;
      const sharedGroups = sharedGroupsByCandidate.get(c.id) ?? [];
      const mutualFriends = mutualFriendsByCandidate.get(c.id) ?? 0;
      const score = sharedGroups.length * 3 + mutualFriends * 2 + overlappingGames;

      let reason: string | null = null;
      if (sharedGroups.length > 0) {
        reason = sharedGroups.length === 1 ? `Also in ${sharedGroups[0]}` : `Also in ${sharedGroups.length} groups with you`;
      } else if (mutualFriends > 0) {
        reason = `${mutualFriends} mutual friend${mutualFriends > 1 ? "s" : ""}`;
      } else if (overlappingGames > 0) {
        reason = `You've both played ${overlappingGames} of the same game${overlappingGames > 1 ? "s" : ""}`;
      }
      if (reason) reasons.set(c.id, reason);

      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return (
    <DiscoverLayout query={query}>
      {!scored.length ? (
        <Card className="items-center gap-2 p-8 text-center">
          <p className="text-sm text-muted-foreground">No one to suggest yet — try searching by username.</p>
        </Card>
      ) : (
        <PersonList people={scored} reasons={reasons} followingSet={followingSet} />
      )}
    </DiscoverLayout>
  );
}

function DiscoverLayout({ query, children }: { query: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackHref="/" />
        <h1 className="font-heading text-xl font-semibold">Discover people</h1>
      </div>

      <form action="/discover" className="flex gap-2">
        <Input name="q" placeholder="Search by username or name" defaultValue={query} className="flex-1" />
        <Button type="submit">Search</Button>
      </form>

      {!query && <h2 className="text-sm font-semibold text-muted-foreground">People you may know</h2>}

      {children}
    </div>
  );
}

function PersonList({
  people,
  reasons,
  followingSet,
}: {
  people: Candidate[];
  reasons: Map<string, string>;
  followingSet: Set<string>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {people.map((p) => {
        const name = p.display_name || p.username;
        return (
          <li key={p.id}>
            <Card className="flex-row items-center gap-2.5 p-3">
              <Link href={`/profile/${p.username}`} className="flex flex-1 items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarImage src={p.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{reasons.get(p.id) || `@${p.username}`}</p>
                </div>
              </Link>
              <FollowButton profileId={p.id} initialFollowing={followingSet.has(p.id)} />
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
