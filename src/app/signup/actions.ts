"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupFormState = { error: string } | { message: string } | null;

export async function signup(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const referralSource = (await cookies()).get("ludifolk_ref")?.value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: referralSource ? { referral_source: referralSource } : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmations disabled (e.g. local dev) — Supabase returns a
  // session immediately rather than requiring a confirmation click.
  if (data.session) {
    redirect("/");
  }

  return { message: "Check your email to confirm your account." };
}
