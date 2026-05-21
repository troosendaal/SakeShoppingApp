"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const IngredientRow = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  is_optional: z.boolean().optional().default(false),
});

const RecipeInput = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().or(z.literal("")).nullable(),
  instructions: z.string().max(10000).optional().nullable(),
  meal_category: z.enum([
    "breakfast",
    "lunch",
    "dinner",
    "dessert",
    "sweets",
    "snack",
  ]),
  food_tags: z.array(z.string().min(1)).default([]),
  base_servings: z.coerce.number().int().positive().default(4),
  prep_time_min: z.coerce.number().int().min(0).optional().nullable(),
  lead_time_min: z.coerce.number().int().min(0).optional().nullable(),
  hero_emoji: z.string().min(1).default("🍽️"),
  source_language: z.enum(["en", "nl", "fr"]).default("en"),
  ingredients: z.array(IngredientRow).min(1, "Add at least one ingredient"),
});

export type CreateRecipeResult =
  | { ok: true; recipeId: string }
  | { ok: false; error: string };

export async function createRecipe(
  raw: unknown,
): Promise<CreateRecipeResult> {
  const parsed = RecipeInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: recipe, error: rErr } = await supabase
    .from("recipes")
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description || null,
      url: input.url || null,
      instructions: input.instructions || null,
      meal_category: input.meal_category,
      food_tags: input.food_tags,
      base_servings: input.base_servings,
      prep_time_min: input.prep_time_min ?? null,
      lead_time_min: input.lead_time_min ?? null,
      hero_emoji: input.hero_emoji,
      source_language: input.source_language,
    })
    .select("id")
    .single();

  if (rErr || !recipe) {
    return { ok: false, error: rErr?.message ?? "Failed to create recipe" };
  }

  const rows = input.ingredients.map((ing, i) => ({
    recipe_id: recipe.id,
    ingredient_id: ing.ingredient_id,
    quantity: ing.quantity,
    unit: ing.unit,
    is_optional: ing.is_optional ?? false,
    position: i,
  }));

  const { error: iErr } = await supabase.from("recipe_ingredients").insert(rows);
  if (iErr) {
    // Best-effort cleanup so we don't leave an orphan recipe.
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { ok: false, error: `Ingredients failed: ${iErr.message}` };
  }

  revalidatePath("/recipes");
  return { ok: true, recipeId: recipe.id };
}

export async function updateRecipe(
  id: string,
  raw: unknown,
): Promise<CreateRecipeResult> {
  if (!id) return { ok: false, error: "Missing recipe id" };

  const parsed = RecipeInput.safeParse(raw);
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

  // RLS makes the owner check redundant, but the explicit .eq is a good seatbelt.
  const { error: rErr } = await supabase
    .from("recipes")
    .update({
      title: input.title,
      description: input.description || null,
      url: input.url || null,
      instructions: input.instructions || null,
      meal_category: input.meal_category,
      food_tags: input.food_tags,
      base_servings: input.base_servings,
      prep_time_min: input.prep_time_min ?? null,
      lead_time_min: input.lead_time_min ?? null,
      hero_emoji: input.hero_emoji,
      source_language: input.source_language,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (rErr) return { ok: false, error: rErr.message };

  // Replace ingredients wholesale. Cleaner than diffing — and recipe_ingredients
  // is the only place ingredient_id is referenced from a recipe, so cascading
  // effects aren't a concern.
  const { error: dErr } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);
  if (dErr) return { ok: false, error: `Clearing ingredients failed: ${dErr.message}` };

  const rows = input.ingredients.map((ing, i) => ({
    recipe_id: id,
    ingredient_id: ing.ingredient_id,
    quantity: ing.quantity,
    unit: ing.unit,
    is_optional: ing.is_optional ?? false,
    position: i,
  }));

  const { error: iErr } = await supabase.from("recipe_ingredients").insert(rows);
  if (iErr) return { ok: false, error: `Ingredients failed: ${iErr.message}` };

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  return { ok: true, recipeId: id };
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/recipes");
  redirect("/recipes");
}
