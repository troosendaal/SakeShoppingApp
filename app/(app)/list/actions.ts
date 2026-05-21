"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveList } from "@/lib/db/shopping-list";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

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
): Promise<ActionResult> {
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

// --------------------------------------------------------------------------
// Per-line state: check off, urgent flag, note
// --------------------------------------------------------------------------
// All three upsert into list_line_state keyed on (list_id, ingredient_id).
// Each only writes the columns it cares about — Supabase's upsert leaves
// columns not in the payload alone on the UPDATE path, so toggling checked
// doesn't clobber the note, etc.

export async function setLineChecked(
  ingredientId: string,
  isChecked: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_line_state")
    .upsert(
      {
        list_id: list.id,
        ingredient_id: ingredientId,
        is_checked: isChecked,
        checked_at: isChecked ? new Date().toISOString() : null,
        checked_by: isChecked ? userId : null,
      },
      { onConflict: "list_id,ingredient_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  return { ok: true };
}

export async function setLineUrgent(
  ingredientId: string,
  isUrgent: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_line_state")
    .upsert(
      {
        list_id: list.id,
        ingredient_id: ingredientId,
        is_urgent: isUrgent,
      },
      { onConflict: "list_id,ingredient_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  return { ok: true };
}

export async function setLineNote(
  ingredientId: string,
  note: string | null,
): Promise<ActionResult> {
  const trimmed = note?.trim() || null;
  if (trimmed && trimmed.length > 200) {
    return { ok: false, error: "Note must be 200 characters or less" };
  }
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_line_state")
    .upsert(
      {
        list_id: list.id,
        ingredient_id: ingredientId,
        note: trimmed,
      },
      { onConflict: "list_id,ingredient_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Ad-hoc items (the quick-add card)
// --------------------------------------------------------------------------

export async function addAdhocItem(
  ingredientId: string,
  quantity: number,
  unit: string,
): Promise<ActionResult> {
  if (!ingredientId) return { ok: false, error: "Pick an ingredient" };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be positive" };
  }
  if (!unit) return { ok: false, error: "Pick a unit" };

  const supabase = await createClient();
  const userId = await getUserId();
  const list = await getOrCreateActiveList();

  const { error } = await supabase.from("list_adhoc_items").insert({
    list_id: list.id,
    ingredient_id: ingredientId,
    quantity,
    unit,
    added_by: userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Finish shopping — moves the active list to History
// --------------------------------------------------------------------------

export async function finishShopping(): Promise<ActionResult> {
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("shopping_lists")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", list.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  revalidatePath("/history");
  return { ok: true };
}
