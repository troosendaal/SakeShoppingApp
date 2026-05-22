"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveList } from "@/lib/db/shopping-list";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// 26-char URL-safe token, similar to slugIDs. Crypto-random.
function randomToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 26);
}

// Create a shareable invite link for the user's active list (or a specific
// list if listId is passed). Default expires_at is 7 days from now.
export async function createInviteLink(
  listId?: string,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const resolvedListId = listId ?? (await getOrCreateActiveList()).id;
  const token = randomToken();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("list_invites").insert({
    list_id: resolvedListId,
    token,
    created_by: user.id,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/list");
  return { ok: true, token, expiresAt };
}

// Remove a member from a list (owner only — RLS enforces).
export async function removeMember(
  listId: string,
  userId: string,
): Promise<ActionResult> {
  if (!listId || !userId) return { ok: false, error: "Missing arguments" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  revalidatePath("/shared");
  return { ok: true };
}

// Member voluntarily leaves a shared list. Self-delete is allowed by RLS.
export async function leaveSharedList(
  listId: string,
): Promise<ActionResult> {
  if (!listId) return { ok: false, error: "Missing list id" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/shared");
  return { ok: true };
}
