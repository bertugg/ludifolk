"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type ProfileFormState } from "./actions";
import { downscaleImage } from "@/lib/downscale-image";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  privacy: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

const AVATAR_MAX_DIMENSION = 512;

/**
 * Uploads straight from the browser to Storage rather than through the
 * updateProfile server action, whose body is capped by the host (4.5MB on
 * Vercel). The avatars RLS policies restrict writes to the user's own folder.
 */
async function uploadAvatar(file: File): Promise<{ path: string } | { error: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're signed out — sign in and try again." };

  const optimized = await downscaleImage(file, AVATAR_MAX_DIMENSION);
  const ext = optimized.name.split(".").pop() || "jpg";
  const path = `${auth.user.id}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, optimized, { upsert: true, contentType: optimized.type });
  return error ? { error: error.message } : { path };
}

async function updateProfileWithAvatar(prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const avatarFile = formData.get("avatar");
  formData.delete("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const result = await uploadAvatar(avatarFile);
    if ("error" in result) return { error: result.error };
    formData.set("avatar_path", result.path);
  }
  return updateProfile(prevState, formData);
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfileWithAvatar, null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-16">
          <AvatarImage src={avatarPreview ?? undefined} alt={profile.username} />
          <AvatarFallback className="text-lg">
            {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAvatarPreview(URL.createObjectURL(file));
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={profile.username} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ""} maxLength={280} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="privacy">Private profile</Label>
          <p className="text-xs text-muted-foreground">Only you can see your profile.</p>
        </div>
        <Switch id="privacy" name="privacy" defaultChecked={profile.privacy === "private"} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
