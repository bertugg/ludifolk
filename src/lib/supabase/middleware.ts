import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token if expired. Required for Server Components,
  // which cannot write cookies themselves.
  const { data } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/profile/") ||
    pathname === "/games" ||
    pathname.startsWith("/games/") ||
    pathname.startsWith("/game-session/") ||
    pathname.startsWith("/wrapped/");

  if (!data.user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // First-touch referral attribution: a visitor following a shared link
  // (e.g. /game-session/[id]?ref=game_session:[id]) gets a cookie recording
  // where they came from, read back at signup. Only set once per visitor,
  // and only for people who aren't already signed in.
  const ref = request.nextUrl.searchParams.get("ref");
  if (!data.user && ref && !request.cookies.get("boardly_ref")) {
    supabaseResponse.cookies.set("boardly_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }

  return supabaseResponse;
}
