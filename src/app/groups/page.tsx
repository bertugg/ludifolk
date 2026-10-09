import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHomeLink } from "@/components/app-home-link";
import { ButtonLink } from "@/components/button-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select(
      `
        group:groups (
          id, slug, name, description, avatar_url,
          members:group_members ( id )
        )
      `,
    )
    .eq("profile_id", auth.user.id);

  const groups = (memberships ?? []).map((m) => m.group).filter((g) => g !== null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppHomeLink />
          <h1 className="type-page-title">Groups</h1>
        </div>
        <ButtonLink href="/groups/new" size="sm">
          Create group
        </ButtonLink>
      </div>

      {groups.length === 0 ? (
        <Card className="items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Create your game-night crew.</p>
          <ButtonLink href="/groups/new" size="sm">
            Create group
          </ButtonLink>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted"
              >
                <Avatar size="lg">
                  <AvatarImage src={g.avatar_url ?? undefined} alt={g.name} />
                  <AvatarFallback>{g.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-sm text-muted-foreground">{g.members.length} members</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
