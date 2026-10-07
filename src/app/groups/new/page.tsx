import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewGroupForm } from "./new-group-form";

export default async function NewGroupPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2">
        <BackButton fallbackHref="/groups" />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 pt-0">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Create a group</CardTitle>
            <CardDescription>Your game-night crew, in one place.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewGroupForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
