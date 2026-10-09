import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/back-button";
import { getSessionData } from "../data";
import { EditSessionForm } from "./edit-session-form";

export default async function EditGameSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const session = await getSessionData(id);
  if (!session || !session.game) {
    notFound();
  }
  if (session.created_by !== auth.user.id) {
    redirect(`/game-session/${id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BackButton fallbackHref={`/game-session/${id}`} />
        <h1 className="type-page-title">Edit result</h1>
      </div>
      <EditSessionForm session={session} game={session.game} />
    </div>
  );
}
