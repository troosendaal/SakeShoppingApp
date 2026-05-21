import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "./recipe-types";

export type UnitSystem = "metric" | "imperial";

export type ProfileData = {
  id: string;
  display_name: string;
  preferred_language: Locale;
  preferred_unit_system: UnitSystem;
  avatar_url: string | null;
};

export type CategoryRow = {
  id: string;
  slug: string;
  emoji: string;
  name_en: string;
  name_nl: string;
  name_fr: string;
  default_position: number;
  position: number; // effective: pref.position OR default_position
  is_hidden: boolean;
};

export async function getMyProfile(): Promise<ProfileData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_language, preferred_unit_system, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as ProfileData;
}

// All 13 categories merged with the user's per-row preferences, sorted by
// their effective position (pref overrides default).
export async function getCategoriesWithPrefs(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [{ data: cats, error: cErr }, { data: prefs, error: pErr }] =
    await Promise.all([
      supabase
        .from("categories")
        .select(
          "id, slug, emoji, name_en, name_nl, name_fr, default_position",
        )
        .order("default_position", { ascending: true }),
      supabase
        .from("user_category_prefs")
        .select("category_id, position, is_hidden")
        .eq("user_id", user.id),
    ]);
  if (cErr) throw cErr;
  if (pErr) throw pErr;

  const prefByCat = new Map<string, { position: number; is_hidden: boolean }>();
  for (const p of prefs ?? []) {
    prefByCat.set(p.category_id as string, {
      position: p.position as number,
      is_hidden: !!p.is_hidden,
    });
  }

  return ((cats ?? []) as Array<Omit<CategoryRow, "position" | "is_hidden">>)
    .map((c) => {
      const pref = prefByCat.get(c.id);
      return {
        ...c,
        position: pref?.position ?? c.default_position,
        is_hidden: pref?.is_hidden ?? false,
      };
    })
    .sort((a, b) => a.position - b.position);
}
