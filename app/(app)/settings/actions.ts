"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/db/recipe-types";

type ActionResult = { ok: true } | { ok: false; error: string };

const ALLOWED_LANGS: Locale[] = ["en", "nl", "fr"];
const ALLOWED_UNITS = ["metric", "imperial"] as const;

export async function updateProfile(input: {
  displayName: string;
  preferredLanguage: Locale;
  preferredUnitSystem: (typeof ALLOWED_UNITS)[number];
}): Promise<ActionResult> {
  const displayName = input.displayName.trim();
  if (!displayName) return { ok: false, error: "Name is required" };
  if (!ALLOWED_LANGS.includes(input.preferredLanguage))
    return { ok: false, error: "Invalid language" };
  if (!ALLOWED_UNITS.includes(input.preferredUnitSystem))
    return { ok: false, error: "Invalid unit system" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      preferred_language: input.preferredLanguage,
      preferred_unit_system: input.preferredUnitSystem,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Bust caches so the topbar avatar/initials and the list page refresh.
  revalidatePath("/", "layout");
  return { ok: true };
}

// Persist the user's desired order for all 13 categories in one round-trip.
// Uses upsert on (user_id, category_id) which is the table's primary key.
export async function saveCategoryOrder(
  categoryIds: string[],
): Promise<ActionResult> {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0)
    return { ok: false, error: "Empty order" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Fetch existing prefs to preserve is_hidden when only the order changed.
  const { data: existing } = await supabase
    .from("user_category_prefs")
    .select("category_id, is_hidden")
    .eq("user_id", user.id);
  const hiddenById = new Map(
    (existing ?? []).map((r) => [r.category_id as string, !!r.is_hidden]),
  );

  const rows = categoryIds.map((id, i) => ({
    user_id: user.id,
    category_id: id,
    position: i + 1,
    is_hidden: hiddenById.get(id) ?? false,
  }));

  const { error } = await supabase
    .from("user_category_prefs")
    .upsert(rows, { onConflict: "user_id,category_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/list");
  revalidatePath("/settings");
  return { ok: true };
}

export async function setCategoryHidden(
  categoryId: string,
  isHidden: boolean,
): Promise<ActionResult> {
  if (!categoryId) return { ok: false, error: "Missing category" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Get the existing position (or fall back to the category's default_position
  // so a brand-new pref row gets a sensible value).
  const { data: existing } = await supabase
    .from("user_category_prefs")
    .select("position")
    .eq("user_id", user.id)
    .eq("category_id", categoryId)
    .maybeSingle();

  let position = (existing?.position as number | undefined) ?? null;
  if (position == null) {
    const { data: cat } = await supabase
      .from("categories")
      .select("default_position")
      .eq("id", categoryId)
      .maybeSingle();
    position = (cat?.default_position as number | undefined) ?? 1;
  }

  const { error } = await supabase
    .from("user_category_prefs")
    .upsert(
      {
        user_id: user.id,
        category_id: categoryId,
        position,
        is_hidden: isHidden,
      },
      { onConflict: "user_id,category_id" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/list");
  revalidatePath("/settings");
  return { ok: true };
}
