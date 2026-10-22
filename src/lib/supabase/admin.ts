import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client: bypasses RLS and can read auth users. Server-only, and
 * only for lookups the anon key can't do — never return what it reads to the
 * client unless the caller has proven they're allowed to see it. Null when
 * SUPABASE_SERVICE_ROLE_KEY isn't configured.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
