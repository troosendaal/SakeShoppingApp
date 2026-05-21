import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link redirect lands here. We:
//   1. Exchange the auth `code` for a real session (sets cookies)
//   2. On first login, create the profiles row from the signup metadata
//   3. Bounce to the `next` URL (defaults to /recipes)
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/recipes";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    const msg = encodeURIComponent(error?.message ?? "auth_failed");
    return NextResponse.redirect(`${origin}/login?error=${msg}`);
  }

  // Upsert profile. ignoreDuplicates: true means we never clobber an existing
  // row — first signup wins, future magic-link logins are no-ops here.
  const meta = (user.user_metadata ?? {}) as {
    display_name?: string;
    preferred_language?: "en" | "nl" | "fr";
  };
  const display_name =
    meta.display_name?.trim() || user.email?.split("@")[0] || "Saké user";
  const preferred_language = meta.preferred_language ?? "en";

  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, display_name, preferred_language },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (profileErr) {
    // Don't block login — log and move on. Worst case the user has no profile
    // row yet and the topbar shows the email prefix.
    console.error("[auth/callback] profile upsert failed:", profileErr);
  }

  // Sync UI locale to the user's preferred_language so the cookie matches
  // the DB on every new device / browser they log into.
  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set("sake_locale", preferred_language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
