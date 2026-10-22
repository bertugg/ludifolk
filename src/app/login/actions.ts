"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USERNAME_PATTERN } from "@/lib/username";

export type AuthFormState = { error: string } | null;

// Same wording Supabase uses for a wrong password, so an unknown username
// can't be told apart from a bad password.
const INVALID_CREDENTIALS = "Invalid login credentials";

/**
 * Supabase signs in by email only, so a username is resolved to its
 * account's email here, server-side; the email never reaches the client.
 */
async function emailForUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) return null;

  const admin = createAdminClient();
  if (!admin) {
    console.error("Username login needs SUPABASE_SERVICE_ROLE_KEY; it isn't set.");
    return null;
  }

  const { data: profile } = await admin.from("profiles").select("id").eq("username", normalized).maybeSingle();
  if (!profile) return null;

  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data.user?.email ?? null;
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const email = identifier.includes("@") ? identifier : await emailForUsername(identifier);
  if (!email) {
    return { error: INVALID_CREDENTIALS };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
