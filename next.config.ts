import type { NextConfig } from "next";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");
const isLocalSupabase = ["127.0.0.1", "localhost", "[::1]"].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  images: {
    // The image optimizer refuses upstreams that resolve to private IPs (SSRF
    // guard), which includes the local Supabase stack — so session photos
    // break in dev. Relax it only when Supabase itself is local; against a
    // hosted project the guard stays on.
    dangerouslyAllowLocalIP: isLocalSupabase,
    remotePatterns: [
      {
        // Derived from the Supabase URL so this works unchanged against
        // local dev (http://127.0.0.1:54321) and a hosted project
        // (https://<ref>.supabase.co). Scoped to the session-photos bucket's
        // signed-URL path only — least privilege, and avoids clashing with
        // the public avatars bucket's different path shape.
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/sign/session-photos/**",
        // No `search` here deliberately — signed URLs carry a one-time
        // token in the query string, so it can't be pinned to an exact
        // value; omitting `search` allows any query string through.
      },
    ],
  },
  // No serverActions.bodySizeLimit override: photos and avatars upload
  // straight from the browser to Supabase Storage, so server action bodies
  // stay small (and the host caps them anyway — 4.5MB on Vercel).
};

export default nextConfig;
