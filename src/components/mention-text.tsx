import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { extractMentions, splitMentions } from "@/lib/mentions";

/**
 * Renders free text with @username tags linked to the tagged profile. Only
 * usernames that resolve to a profile the viewer can see are linked — an
 * unknown or private handle stays plain text. Server-only; must not be
 * rendered inside another link.
 */
export async function MentionText({ text }: { text: string }) {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return text;

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("username").in("username", usernames);
  const known = new Set((profiles ?? []).map((p) => p.username));

  return splitMentions(text).map((segment, i) =>
    "username" in segment && known.has(segment.username) ? (
      <Link
        key={i}
        href={`/profile/${segment.username}`}
        className="font-medium not-italic text-primary hover:underline"
      >
        {segment.text}
      </Link>
    ) : (
      segment.text
    ),
  );
}
