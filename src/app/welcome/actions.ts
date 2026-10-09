"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_PATTERN, USERNAME_RULES } from "@/lib/username";

export type ChooseUsernameState = { error: string } | null;

export async function chooseUsername(
  _prevState: ChooseUsernameState,
  formData: FormData,
): Promise<ChooseUsernameState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    return { error: USERNAME_RULES };
  }

  const { error } = await supabase.from("profiles").update({ username }).eq("id", auth.user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  redirect("/");
}
