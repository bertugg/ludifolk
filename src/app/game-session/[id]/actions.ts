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

export async function deleteGameSession(sessionId: string): Promise<{ error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("created_by", auth.user.id)
    .maybeSingle();
  if (!session) {
    return { error: "Only the person who logged this game can delete it." };
  }

  // Photo files first, while the session row still exists — the storage
  // delete policy checks it. Listing the folder (rather than the photos
  // table) also sweeps up any orphaned uploads. The photos rows themselves,
  // like participants, likes, comments and activities, cascade with the session.
  const bucket = supabase.storage.from("session-photos");
  const { data: files, error: listError } = await bucket.list(sessionId);
  if (listError) {
    return { error: listError.message };
  }
  if (files.length > 0) {
    const { error: removeError } = await bucket.remove(files.map((f) => `${sessionId}/${f.name}`));
    if (removeError) {
      return { error: removeError.message };
    }
  }

  const { error } = await supabase.from("game_sessions").delete().eq("id", sessionId).eq("created_by", auth.user.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
