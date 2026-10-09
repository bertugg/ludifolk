import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPlaceholderUsername, suggestUsername } from "@/lib/username";
import { ChooseUsernameForm } from "./choose-username-form";

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  // Already picked one — this step is only for fresh accounts.
  if (profile && !hasPlaceholderUsername(auth.user.id, profile.username)) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Pick your username</CardTitle>
          <CardDescription>This is how other players find you on Ludifolk.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChooseUsernameForm suggestion={suggestUsername(auth.user.email)} />
        </CardContent>
      </Card>
    </div>
  );
}
