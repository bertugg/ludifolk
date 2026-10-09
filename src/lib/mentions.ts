// @username tags in free text (session notes, comments). The username part
// mirrors USERNAME_PATTERN in settings/profile/actions.ts. The lookbehind
// keeps email addresses (a@bob_smith.com) and mid-word @s from matching.
const MENTION_PATTERN = /(?<![a-z0-9_.])@([a-z0-9_]{3,20})(?![a-z0-9_])/gi;

export type MentionSegment = { text: string } | { text: string; username: string };

export function splitMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_PATTERN)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    segments.push({ text: match[0], username: match[1].toLowerCase() });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

export function extractMentions(text: string): string[] {
  return [
    ...new Set(
      splitMentions(text)
        .filter((s) => "username" in s)
        .map((s) => (s as { username: string }).username),
    ),
  ];
}
