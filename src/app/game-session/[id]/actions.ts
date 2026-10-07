"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CommentFormState = { error: string } | { ok: true } | null;

export async function addComment(
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const sessionId = String(formData.get("session_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return { error: "Comment can't be empty." };
  }
  if (body.length > 2000) {
    return { error: "Comment is too long." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("comments")
    .insert({ game_session_id: sessionId, profile_id: auth.user.id, body });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/game-session/${sessionId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  await supabase.from("comments").delete().eq("id", commentId).eq("profile_id", auth.user.id);
}
