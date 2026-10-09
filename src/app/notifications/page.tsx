import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/follow-button";
import { confirmParticipation, declineParticipation } from "./actions";
import { acceptInvitation, declineInvitation } from "@/app/groups/[slug]/actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      `
        id, type, created_at, game_session_id, group_id, actor_id, comment_id,
        actor:profiles!notifications_actor_id_fkey ( username, display_name, avatar_url ),
        session:game_sessions ( id, played_at, game:games ( title ) ),
        group:groups ( slug, name )
      `,
    )
    .eq("profile_id", auth.user.id)
    .order("created_at", { ascending: false });

  const sessionIds = (notifications ?? [])
    .map((n) => n.game_session_id)
    .filter((id): id is string => id !== null);

  const { data: myParticipations } = sessionIds.length
    ? await supabase
        .from("game_participants")
        .select("session_id, confirmation_status")
        .eq("profile_id", auth.user.id)
        .in("session_id", sessionIds)
    : { data: [] as { session_id: string; confirmation_status: string }[] };

  const statusBySession = new Map(
    (myParticipations ?? []).map((p) => [p.session_id, p.confirmation_status]),
  );

  const groupIds = (notifications ?? [])
    .map((n) => n.group_id)
    .filter((id): id is string => id !== null);

  const { data: myInvitations } = groupIds.length
    ? await supabase
        .from("group_invitations")
        .select("group_id, status")
        .eq("invitee_id", auth.user.id)
        .in("group_id", groupIds)
    : { data: [] as { group_id: string; status: string }[] };

  const invitationStatusByGroup = new Map((myInvitations ?? []).map((i) => [i.group_id, i.status]));

  const followerIds = (notifications ?? [])
    .filter((n) => n.type === "new_follower")
    .map((n) => n.actor_id)
    .filter((id): id is string => id !== null);

  const { data: myFollows } = followerIds.length
    ? await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", auth.user.id)
        .in("following_id", followerIds)
    : { data: [] as { following_id: string }[] };

  const followingBack = new Set((myFollows ?? []).map((f) => f.following_id));

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", auth.user.id)
    .eq("is_read", false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackHref="/" />
        <h1 className="font-heading text-xl font-semibold">Notifications</h1>
      </div>

      {!notifications?.length && (
        <Card className="items-center p-8 text-center">
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {notifications?.map((n) => {
          const actorName = n.actor?.display_name || n.actor?.username || "Someone";

          if (n.type === "participant_confirmation_request" && n.session && n.game_session_id) {
            const gameTitle = n.session.game?.title ?? "a game";
            const status = statusBySession.get(n.game_session_id) ?? "pending";

            return (
              <li key={n.id}>
                <Card>
                  <CardContent className="flex items-start gap-2.5">
                    <Avatar size="sm">
                      <AvatarImage src={n.actor?.avatar_url ?? undefined} alt={actorName} />
                      <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-2">
                      <Link href={`/game-session/${n.game_session_id}`} className="text-sm hover:underline">
                        <span className="font-medium">{actorName}</span> added you to{" "}
                        <span className="font-medium">{gameTitle}</span>
                      </Link>
                      {status === "pending" && (
                        <div className="flex gap-2">
                          <form action={confirmParticipation}>
                            <input type="hidden" name="session_id" value={n.game_session_id} />
                            <Button type="submit" size="sm">
                              Confirm
                            </Button>
                          </form>
                          <form action={declineParticipation}>
                            <input type="hidden" name="session_id" value={n.game_session_id} />
                            <Button type="submit" size="sm" variant="outline">
                              Not me
                            </Button>
                          </form>
                        </div>
                      )}
                      {status === "confirmed" && (
                        <p className="text-xs text-muted-foreground">You confirmed this.</p>
                      )}
                      {status === "declined" && (
                        <p className="text-xs text-muted-foreground">You said this wasn&apos;t you.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (n.type === "new_follower" && n.actor) {
            return (
              <li key={n.id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-2.5">
                    <Link
                      href={`/profile/${n.actor.username}`}
                      className="flex items-center gap-2.5 text-sm hover:underline"
                    >
                      <Avatar size="sm">
                        <AvatarImage src={n.actor.avatar_url ?? undefined} alt={actorName} />
                        <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="font-medium">{actorName}</span> started following you
                      </span>
                    </Link>
                    {n.actor_id && (
                      <FollowButton
                        profileId={n.actor_id}
                        initialFollowing={followingBack.has(n.actor_id)}
                        followLabel="Follow back"
                      />
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (n.type === "mention" && n.session && n.game_session_id) {
            const gameTitle = n.session.game?.title ?? "a game";

            return (
              <li key={n.id}>
                <Card>
                  <CardContent>
                    <Link
                      href={`/game-session/${n.game_session_id}`}
                      className="flex items-center gap-2.5 text-sm hover:underline"
                    >
                      <Avatar size="sm">
                        <AvatarImage src={n.actor?.avatar_url ?? undefined} alt={actorName} />
                        <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="font-medium">{actorName}</span>{" "}
                        {n.comment_id ? "mentioned you in a comment on" : "tagged you in"}{" "}
                        <span className="font-medium">{gameTitle}</span>
                      </span>
                    </Link>
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (n.type === "group_invitation" && n.group && n.group_id) {
            const status = invitationStatusByGroup.get(n.group_id) ?? "pending";

            return (
              <li key={n.id}>
                <Card>
                  <CardContent className="flex items-start gap-2.5">
                    <Avatar size="sm">
                      <AvatarImage src={n.actor?.avatar_url ?? undefined} alt={actorName} />
                      <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-2">
                      <Link href={`/groups/${n.group.slug}`} className="text-sm hover:underline">
                        <span className="font-medium">{actorName}</span> invited you to{" "}
                        <span className="font-medium">{n.group.name}</span>
                      </Link>
                      {status === "pending" && (
                        <div className="flex gap-2">
                          <form action={acceptInvitation.bind(null, n.group_id)}>
                            <Button type="submit" size="sm">
                              Accept
                            </Button>
                          </form>
                          <form action={declineInvitation.bind(null, n.group_id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Decline
                            </Button>
                          </form>
                        </div>
                      )}
                      {status === "accepted" && (
                        <p className="text-xs text-muted-foreground">You joined this group.</p>
                      )}
                      {status === "declined" && (
                        <p className="text-xs text-muted-foreground">You declined this invite.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          }

          return null;
        })}
      </ul>
    </div>
  );
}
