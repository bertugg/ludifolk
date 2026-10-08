"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InviteMemberFormState = { error: string } | { ok: true } | null;

export async function inviteMember(
  _prevState: InviteMemberFormState,
  formData: FormData,
): Promise<InviteMemberFormState> {
  const groupId = String(formData.get("group_id") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (!username) {
    return { error: "Enter a username." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) {
    return { error: `No Ludifolk user found with username "${username}".` };
  }

  const { data: existingMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingMember) {
    return { error: "They're already in this group." };
  }

  const { error } = await supabase
    .from("group_invitations")
    .insert({ group_id: groupId, invitee_id: profile.id, invited_by: auth.user.id });

  if (error) {
    if (error.code === "23505") {
      return { error: "They've already been invited." };
    }
    return { error: error.message };
  }

  return { ok: true };
}

export async function acceptInvitation(groupId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, profile_id: auth.user.id, added_by: auth.user.id });

  if (memberError && memberError.code !== "23505") {
    return;
  }

  await supabase
    .from("group_invitations")
    .update({ status: "accepted" })
    .eq("group_id", groupId)
    .eq("invitee_id", auth.user.id);

  revalidatePath("/notifications");
  revalidatePath("/groups");
}

export async function declineInvitation(groupId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  await supabase
    .from("group_invitations")
    .update({ status: "declined" })
    .eq("group_id", groupId)
    .eq("invitee_id", auth.user.id);

  revalidatePath("/notifications");
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  await supabase.from("group_members").delete().eq("group_id", groupId).eq("profile_id", auth.user.id);
  revalidatePath("/groups");
  redirect("/groups");
}

export async function removeMember(groupId: string, profileId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  await supabase.from("group_members").delete().eq("group_id", groupId).eq("profile_id", profileId);
}
