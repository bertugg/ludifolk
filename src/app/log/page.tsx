import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ButtonLink } from "@/components/button-link";
import { searchGames } from "@/lib/actions/search-games";
import { LogGameForm } from "./log-game-form";

export default async function LogPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const [games, { data: profile }, { data: groupRows }] = await Promise.all([
    searchGames(""),
    supabase.from("profiles").select("username, display_name").eq("id", auth.user.id).single(),
    supabase
      .from("group_members")
      .select(
        `
          group:groups (
            id, name,
            members:group_members (
              profile:profiles!group_members_profile_id_fkey ( id, username, display_name )
            )
          )
        `,
      )
      .eq("profile_id", auth.user.id),
  ]);

  const groups = (groupRows ?? [])
    .map((r) => r.group)
    .filter((g) => g !== null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members.map((m) => m.profile).filter((p) => p !== null),
    }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2">
        <BackButton fallbackHref="/" />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 pt-0">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Log a game</CardTitle>
            <CardDescription>What happened at game night?</CardDescription>
          </CardHeader>
          <CardContent>
            {games.length ? (
              <LogGameForm
                initialGames={games}
                ownUsername={profile?.username ?? ""}
                ownDisplayName={profile?.display_name ?? null}
                groups={groups}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No games in the catalog yet — nothing to log.
                </p>
                <ButtonLink href="/games" variant="outline" size="sm">
                  Browse games
                </ButtonLink>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
