"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function setConfirmation(formData: FormData, status: "confirmed" | "declined") {
  const sessionId = String(formData.get("session_id") ?? "");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  await supabase
    .from("game_participants")
    .update({ confirmation_status: status })
    .eq("session_id", sessionId)
    .eq("profile_id", auth.user.id);

  revalidatePath("/notifications");
}

export async function confirmParticipation(formData: FormData) {
  await setConfirmation(formData, "confirmed");
}

export async function declineParticipation(formData: FormData) {
  await setConfirmation(formData, "declined");
}
