import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ButtonLink } from "@/components/button-link";
import { FeedCard, type FeedItem } from "@/components/feed-card";
import { InviteMemberForm } from "./invite-member-form";
import { RemoveMemberButton } from "./remove-member-button";
import { GroupTabs } from "./group-tabs";
import { leaveGroup } from "./actions";

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }
  const userId = auth.user.id;

  const { data: group } = await supabase
    .from("groups")
    .select(
      `
        id, slug, name, description, avatar_url,
        members:group_members (
          id, role, profile_id,
          profile:profiles!group_members_profile_id_fkey ( username, display_name, avatar_url )
        )
      `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const myMembership = group.members.find((m) => m.profile_id === userId);
  const isOwner = myMembership?.role === "owner";
  const members = [...group.members].sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));

  const { data: pendingInvites } = await supabase
    .from("group_invitations")
    .select("id, invitee:profiles!group_invitations_invitee_id_fkey ( username, display_name )")
    .eq("group_id", group.id)
    .eq("status", "pending");

  const { data: sessionsRaw } = await supabase
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
        comments ( id )
      `,
    )
    .eq("group_id", group.id)
    .order("played_at", { ascending: false })
    .limit(20);

  const feedItems: FeedItem[] = (sessionsRaw ?? [])
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
      },
    }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <BackButton fallbackHref="/groups" />

      <div className="flex items-center gap-3">
        <Avatar size="lg" className="size-16">
          <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
          <AvatarFallback className="text-xl">{group.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-heading text-xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{members.length} members</p>
        </div>
      </div>

      {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}

      <GroupTabs
        feed={
          <div className="flex flex-col gap-3 pt-3">
            {feedItems.length === 0 ? (
              <Card className="items-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">No games logged for this group yet.</p>
                <ButtonLink href="/log" size="sm">
                  Log a game
                </ButtonLink>
              </Card>
            ) : (
              feedItems.map((item) => <FeedCard key={item.id} item={item} />)
            )}
          </div>
        }
        members={
          <div className="flex flex-col gap-4 pt-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Members</h2>
              <ul className="flex flex-col gap-1.5">
                {members.map((m) => {
                  const name = m.profile?.display_name || m.profile?.username || "Unknown";
                  return (
                    <li key={m.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                      <Avatar size="sm">
                        <AvatarImage src={m.profile?.avatar_url ?? undefined} alt={name} />
                        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium">{name}</span>
                      {m.role === "owner" && <Badge variant="secondary">Owner</Badge>}
                      {isOwner && m.profile_id !== userId && (
                        <RemoveMemberButton groupId={group.id} profileId={m.profile_id} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {myMembership && (
              <>
                {pendingInvites && pendingInvites.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">Pending invites</h2>
                    <ul className="flex flex-col gap-1.5">
                      {pendingInvites.map((inv) => (
                        <li
                          key={inv.id}
                          className="flex items-center justify-between rounded-lg border border-dashed border-border p-2.5 text-sm"
                        >
                          <span>{inv.invitee?.display_name || inv.invitee?.username || "Unknown"}</span>
                          <Badge variant="secondary">Invited</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">Invite a member</h2>
                  <InviteMemberForm groupId={group.id} />
                </div>

                <form action={leaveGroup.bind(null, group.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Leave group
                  </Button>
                </form>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}
