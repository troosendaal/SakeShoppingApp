"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { IngredientLite } from "@/lib/db/recipe-types";

const CreateIngredientSchema = z.object({
  name_en: z.string().min(1, "English name is required").max(120),
  name_nl: z.string().min(1, "Dutch name is required").max(120),
  name_fr: z.string().min(1, "French name is required").max(120),
  aliases_en: z.array(z.string().min(1)).default([]),
  aliases_nl: z.array(z.string().min(1)).default([]),
  aliases_fr: z.array(z.string().min(1)).default([]),
  emoji: z.string().min(1, "Emoji is required").max(8),
  category_id: z.string().uuid("Pick a category"),
  item_kind: z.enum(["food", "household"]).default("food"),
  canonical_unit_type: z.enum(["mass", "volume", "count"]),
});

export type CreateIngredientResult =
  | { ok: true; ingredient: IngredientLite }
  | { ok: false; error: string };

// Insert a new ingredient owned by the current user. Aliases come from the
// modal as text[] arrays already (the form splits comma-separated strings).
export async function createIngredient(
  raw: unknown,
): Promise<CreateIngredientResult> {
  const parsed = CreateIngredientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Generate a slug from the English name + a short random suffix so
  // collisions on common names ("Onion") don't fail the unique constraint.
  const baseSlug = input.name_en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "ingredient";
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${baseSlug}-${suffix}`;

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      slug,
      emoji: input.emoji,
      name_en: input.name_en.trim(),
      name_nl: input.name_nl.trim(),
      name_fr: input.name_fr.trim(),
      aliases_en: input.aliases_en,
      aliases_nl: input.aliases_nl,
      aliases_fr: input.aliases_fr,
      category_id: input.category_id,
      item_kind: input.item_kind,
      canonical_unit_type: input.canonical_unit_type,
      owner_id: user.id,
    })
    .select("id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create ingredient" };
  }

  // Invalidate pages that render ingredient lists so the new row shows up.
  revalidatePath("/recipes/new");
  revalidatePath("/list");

  return { ok: true, ingredient: data as IngredientLite };
}
