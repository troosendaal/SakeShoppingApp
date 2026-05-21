import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Auth middleware: redirect unauthenticated users to /login, and
// redirect authenticated users away from /login and /signup.
// If Supabase env vars aren't set yet, the middleware is a no-op so
// the app still builds and renders the static shell on Vercel.
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/signup");

  if (!user && !isAuthPage) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthPage) {
    url.pathname = "/recipes";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // skip _next, static files, api, invite tokens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$|api|invite).*)",
  ],
};
