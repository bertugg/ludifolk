"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type CreateGroupFormState = { error: string } | null;

export async function createGroup(
  _prevState: CreateGroupFormState,
  formData: FormData,
): Promise<CreateGroupFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Group name is required." };
  }
  const description = String(formData.get("description") ?? "").trim() || null;

  const baseSlug = slugify(name) || "group";
  let slug = baseSlug;
  let groupId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, slug, description, created_by: auth.user.id })
      .select("id")
      .single();

    if (!error && group) {
      groupId = group.id;
      break;
    }
    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }

  if (!groupId) {
    return { error: "Could not generate a unique URL for this group. Try a different name." };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, profile_id: auth.user.id, role: "owner", added_by: auth.user.id });

  if (memberError) {
    await supabase.from("groups").delete().eq("id", groupId);
    return { error: memberError.message };
  }

  redirect(`/groups/${slug}`);
}
