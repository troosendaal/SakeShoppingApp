import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string;
  preferredLanguage: "en" | "nl" | "fr";
};

// Server-side helper: returns the logged-in user + their profile row,
// or null if not logged in / Supabase not configured.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, preferred_language")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? null,
      displayName:
        profile?.display_name?.trim() || user.email?.split("@")[0] || "Saké user",
      preferredLanguage: (profile?.preferred_language ?? "en") as
        | "en"
        | "nl"
        | "fr",
    };
  } catch {
    return null;
  }
}

// Compute "MV" from "Maria Vandercammen" — at most 2 letters, uppercased.
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
}
