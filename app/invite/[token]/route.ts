import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Invite acceptance handler. Calls the consume_list_invite RPC so a non-
// owner can add themselves to list_members (regular RLS would block).
// Unauthenticated users get bounced to /login first; the token is stuffed
// into ?next so they come back here after sign-in.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { origin } = req.nextUrl;

  if (!token) {
    return NextResponse.redirect(`${origin}/shared?invite=missing`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Send through login then back here.
    const back = encodeURIComponent(`/invite/${token}`);
    return NextResponse.redirect(`${origin}/login?next=${back}`);
  }

  const { data, error } = await supabase.rpc("consume_list_invite", {
    invite_token: token,
  });

  if (error) {
    console.error("[invite] consume failed:", error);
    const reason = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/shared?invite=error&reason=${reason}`);
  }

  // RPC returns the list_id of the list we just joined.
  const listId = typeof data === "string" ? data : "";
  return NextResponse.redirect(
    `${origin}/shared/${listId}?invite=joined`,
  );
}
