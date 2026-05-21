"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveList } from "@/lib/db/shopping-list";

// Add (or update) a recipe on the user's active shopping list with the
// given servings. If the recipe is already on the list, the servings get
// overwritten (upsert).
export async function addRecipeToActiveList(
  recipeId: string,
  servings: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!recipeId) return { ok: false, error: "Missing recipeId" };
  if (!Number.isFinite(servings) || servings <= 0) {
    return { ok: false, error: "Servings must be positive" };
  }

  const supabase = await createClient();
  const list = await getOrCreateActiveList();

  const { error } = await supabase
    .from("list_recipes")
    .upsert(
      { list_id: list.id, recipe_id: recipeId, servings },
      { onConflict: "list_id,recipe_id" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true };
}

// Remove a recipe from the active list. Doesn't touch line state.
export async function removeRecipeFromActiveList(
  recipeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_recipes")
    .delete()
    .eq("list_id", list.id)
    .eq("recipe_id", recipeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true };
}
