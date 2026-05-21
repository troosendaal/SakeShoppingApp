import { type NextRequest, NextResponse } from "next/server";
import { type CookieOptions, createServerClient } from "@supabase/ssr";

// Auth middleware: redirect unauthenticated users to /login, and
// redirect authenticated users away from /login and /signup.
//
// Designed to FAIL OPEN — if env vars are missing, malformed, or the
// Supabase request itself errors, we fall through with NextResponse.next()
// instead of crashing the whole edge function (which would return a 500
// MIDDLEWARE_INVOCATION_FAILED for every request).
export async function middleware(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Not configured yet — let everything through so the static shell renders.
    if (!supabaseUrl || !supabaseKey) return NextResponse.next();

    // Cheap sanity check on the URL — malformed values cause @supabase/ssr to throw.
    try {
      new URL(supabaseUrl);
    } catch {
      return NextResponse.next();
    }

    const res = NextResponse.next();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (
          cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const url = req.nextUrl.clone();
    // /auth/* covers the magic-link callback — must pass through regardless of
    // auth state so the session can be established.
    const isAuthPage =
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/signup") ||
      url.pathname.startsWith("/auth");

    if (!user && !isAuthPage) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user && isAuthPage) {
      url.pathname = "/recipes";
      return NextResponse.redirect(url);
    }

    return res;
  } catch (err) {
    // Don't take the whole site down on a middleware error — log and pass through.
    console.error("[middleware] failed, passing through:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // skip _next, static files, api, invite tokens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$|api|invite).*)",
  ],
};
