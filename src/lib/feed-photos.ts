import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Signs every feed photo in one storage round-trip and returns a lookup from
 * storage path to signed URL. Paths that fail to sign are simply absent.
 */
export async function signFeedPhotos(supabase: ServerClient, paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  const { data } = await supabase.storage.from("session-photos").createSignedUrls(paths, 3600);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  }
  return urls;
}

/** A session's signed photo URLs in upload order, skipping any that failed to sign. */
export function sessionPhotoUrls(
  photos: { storage_path: string; created_at: string }[],
  signed: Map<string, string>,
): string[] {
  return [...photos]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((p) => signed.get(p.storage_path))
    .filter((url): url is string => !!url);
}
