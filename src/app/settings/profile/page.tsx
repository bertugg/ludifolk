import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { ProfileForm } from "./profile-form";

export default async function SettingsProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, privacy")
    .eq("id", auth.user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2">
        <BackButton fallbackHref={`/profile/${profile.username}`} />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 pt-0">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Edit profile</CardTitle>
            <CardDescription>This is how other players see you.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
