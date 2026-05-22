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
// Manual quantity / unit override
// --------------------------------------------------------------------------
// Persists the user's overrides without touching the recipe contributions
// underneath. Clearing the override (passing null) falls back to the
// auto-summed quantity in the next render.

export async function setLineQuantity(
  ingredientId: string,
  quantity: number,
  unit: string,
): Promise<ActionResult> {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be positive" };
  }
  if (!unit) return { ok: false, error: "Pick a unit" };
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_line_state")
    .upsert(
      {
        list_id: list.id,
        ingredient_id: ingredientId,
        quantity_override: quantity,
        unit_override: unit,
      },
      { onConflict: "list_id,ingredient_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/list");
  return { ok: true };
}

export async function clearLineQuantityOverride(
  ingredientId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const list = await getOrCreateActiveList();
  const { error } = await supabase
    .from("list_line_state")
    .upsert(
      {
        list_id: list.id,
        ingredient_id: ingredientId,
        quantity_override: null,
        unit_override: null,
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

// Bulk-add multiple ad-hoc items in one round-trip. Each input is a
// pre-matched (ingredient_id, quantity, unit) tuple — the client does the
// parsing + matching, so this server action just validates and inserts.
export async function addBulkAdhocItems(
  items: Array<{ ingredient_id: string; quantity: number; unit: string }>,
): Promise<
  | { ok: true; addedCount: number }
  | { ok: false; error: string }
> {
  if (!Array.isArray(items) || items.length === 0)
    return { ok: false, error: "Nothing to add" };

  // Validate each row up front so a single bad item doesn't half-fail.
  for (const it of items) {
    if (!it.ingredient_id)
      return { ok: false, error: "Each item needs an ingredient" };
    if (!Number.isFinite(it.quantity) || it.quantity <= 0)
      return { ok: false, error: "Each item needs a positive quantity" };
    if (!it.unit) return { ok: false, error: "Each item needs a unit" };
  }

  const supabase = await createClient();
  const userId = await getUserId();
  const list = await getOrCreateActiveList();

  const rows = items.map((it) => ({
    list_id: list.id,
    ingredient_id: it.ingredient_id,
    quantity: it.quantity,
    unit: it.unit,
    added_by: userId,
  }));

  const { error } = await supabase.from("list_adhoc_items").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/list");
  return { ok: true, addedCount: rows.length };
}

// --------------------------------------------------------------------------
// Duplicate a past (completed/archived) list into a new active one.
// Clones list_recipes and list_adhoc_items but resets line state — checks,
// notes, urgent flags, and qty overrides do not carry over (intentional;
// you're starting a fresh shop). The previous "currently active" list is
// archived so the duplicate becomes the one visible on /list.
// --------------------------------------------------------------------------

export async function duplicateShoppingList(
  sourceListId: string,
): Promise<{ ok: true; newListId: string } | { ok: false; error: string }> {
  if (!sourceListId) return { ok: false, error: "Missing list id" };

  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  // 1. Confirm the source list belongs to this user (RLS will reject other
  //    cases anyway, but explicit check gives a friendlier error).
  const { data: source, error: srcErr } = await supabase
    .from("shopping_lists")
    .select("id, title")
    .eq("id", sourceListId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (srcErr) return { ok: false, error: srcErr.message };
  if (!source) return { ok: false, error: "List not found" };

  // 2. Archive any currently-active list so there's only one active at a time.
  await supabase
    .from("shopping_lists")
    .update({ status: "archived" })
    .eq("owner_id", userId)
    .eq("status", "active");

  // 3. Create the new active list, link it to the source for traceability.
  const { data: newList, error: nlErr } = await supabase
    .from("shopping_lists")
    .insert({
      owner_id: userId,
      title: source.title || "Shopping list",
      status: "active",
      source_list_id: sourceListId,
    })
    .select("id")
    .single();
  if (nlErr || !newList) {
    return { ok: false, error: nlErr?.message ?? "Failed to create new list" };
  }

  // 4. Clone recipes — the trigger on list_recipes auto-bumps each recipe's
  //    usage_count, which we want.
  const { data: recipes, error: rErr } = await supabase
    .from("list_recipes")
    .select("recipe_id, servings")
    .eq("list_id", sourceListId);
  if (rErr) return { ok: false, error: rErr.message };
  if (recipes && recipes.length > 0) {
    const rows = recipes.map((r) => ({
      list_id: newList.id,
      recipe_id: r.recipe_id,
      servings: r.servings,
    }));
    const { error: insRErr } = await supabase.from("list_recipes").insert(rows);
    if (insRErr) return { ok: false, error: insRErr.message };
  }

  // 5. Clone ad-hoc items.
  const { data: adhoc, error: aErr } = await supabase
    .from("list_adhoc_items")
    .select("ingredient_id, quantity, unit")
    .eq("list_id", sourceListId);
  if (aErr) return { ok: false, error: aErr.message };
  if (adhoc && adhoc.length > 0) {
    const rows = adhoc.map((a) => ({
      list_id: newList.id,
      ingredient_id: a.ingredient_id,
      quantity: a.quantity,
      unit: a.unit,
      added_by: userId,
    }));
    const { error: insAErr } = await supabase
      .from("list_adhoc_items")
      .insert(rows);
    if (insAErr) return { ok: false, error: insAErr.message };
  }

  revalidatePath("/list");
  revalidatePath("/history");
  return { ok: true, newListId: newList.id };
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
