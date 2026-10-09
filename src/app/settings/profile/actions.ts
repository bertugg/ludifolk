"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error: string } | null;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const isPrivate = formData.get("privacy") === "on";
  const avatarPath = String(formData.get("avatar_path") ?? "");

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Username must be 3-20 characters: lowercase letters, numbers, and underscores only.",
    };
  }

  let avatarUrl: string | undefined;
  if (avatarPath) {
    // The file itself was uploaded by the client (see profile-form.tsx);
    // only accept a path inside the caller's own avatar folder.
    if (!avatarPath.startsWith(`${auth.user.id}/`)) {
      return { error: "Invalid avatar upload." };
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName || null,
      bio: bio || null,
      privacy: isPrivate ? "private" : "public",
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", auth.user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  revalidatePath(`/profile/${username}`);
  redirect(`/profile/${username}`);
}
