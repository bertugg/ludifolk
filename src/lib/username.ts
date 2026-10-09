export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export const USERNAME_RULES = "Username must be 3-20 characters: lowercase letters, numbers, and underscores only.";

/**
 * The handle_new_user trigger names every new account `user_<first 8 id
 * chars>` until the person picks a real username — that placeholder is how
 * we know they haven't yet.
 */
export function hasPlaceholderUsername(profileId: string, username: string): boolean {
  return username === `user_${profileId.slice(0, 8)}`;
}

/** A valid starting suggestion derived from an email's local part, or "" if none fits. */
export function suggestUsername(email: string | undefined): string {
  const base = (email ?? "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  return USERNAME_PATTERN.test(base) ? base : "";
}
