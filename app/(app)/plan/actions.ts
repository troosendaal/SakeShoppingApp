"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveList } from "@/lib/db/shopping-list";
import { getOrCreateMealPlan, type MealSlot } from "@/lib/db/meal-plan";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const ALLOWED_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

// Recompute a recipe's row on the user's active shopping list from the
// total servings across all of their meal_plan_entries for that recipe.
// If the recipe has no remaining entries, delete the row from the list.
// RLS scopes meal_plan_entries to the current user via the meal_plans FK,
// so a plain SELECT is safe.
//
// Returns true on success, false on (logged) failure. Never throws — callers
// can decide whether a partial failure should still report success on the
// meal-plan side.
async function syncRecipeToShoppingList(recipeId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const list = await getOrCreateActiveList();

    const { data: entries, error: cntErr } = await supabase
      .from("meal_plan_entries")
      .select("servings")
      .eq("recipe_id", recipeId);
    if (cntErr) {
      console.error("[sync] count entries failed:", cntErr);
      return false;
    }

    const totalServings = (entries ?? []).reduce(
      (sum, e) => sum + (Number(e.servings) || 0),
      0,
    );

    if (totalServings > 0) {
      const { error: upErr } = await supabase
        .from("list_recipes")
        .upsert(
          { list_id: list.id, recipe_id: recipeId, servings: totalServings },
          { onConflict: "list_id,recipe_id" },
        );
      if (upErr) {
        console.error("[sync] upsert list_recipes failed:", upErr);
        return false;
      }
    } else {
      const { error: delErr } = await supabase
        .from("list_recipes")
        .delete()
        .eq("list_id", list.id)
        .eq("recipe_id", recipeId);
      if (delErr) {
        console.error("[sync] delete list_recipes failed:", delErr);
        return false;
      }
    }
    console.log(
      `[sync] recipe ${recipeId.slice(0, 8)} → list ${list.id.slice(0, 8)}: servings=${totalServings}`,
    );
    return true;
  } catch (err) {
    console.error("[sync] unexpected error:", err);
    return false;
  }
}

export async function addMealPlanEntry(input: {
  weekStart: string;
  date: string;
  mealSlot: MealSlot;
  recipeId: string;
  servings: number;
}): Promise<ActionResult<{ entryId: string }>> {
  const { weekStart, date, mealSlot, recipeId, servings } = input;
  if (!weekStart || !date) return { ok: false, error: "Missing date" };
  if (!ALLOWED_SLOTS.includes(mealSlot))
    return { ok: false, error: "Invalid meal slot" };
  if (!recipeId) return { ok: false, error: "Pick a recipe" };
  if (!Number.isFinite(servings) || servings <= 0)
    return { ok: false, error: "Servings must be positive" };

  const supabase = await createClient();
  const plan = await getOrCreateMealPlan(weekStart);

  // Compute the next position within this day + slot so multiple meals stack
  // in insertion order.
  const { data: existing } = await supabase
    .from("meal_plan_entries")
    .select("position")
    .eq("meal_plan_id", plan.id)
    .eq("date", date)
    .eq("meal_slot", mealSlot)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("meal_plan_entries")
    .insert({
      meal_plan_id: plan.id,
      date,
      meal_slot: mealSlot,
      recipe_id: recipeId,
      servings,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  // Mirror the change onto the active shopping list. Sync failures are logged
  // but don't undo the meal-plan add — the user can manually rebuild via the
  // "Build shopping list" button if anything got out of sync.
  await syncRecipeToShoppingList(recipeId);

  revalidatePath("/plan");
  revalidatePath("/list");
  return { ok: true, entryId: data.id };
}

export async function removeMealPlanEntry(
  entryId: string,
): Promise<ActionResult> {
  if (!entryId) return { ok: false, error: "Missing entry id" };
  const supabase = await createClient();

  // Capture the recipe_id BEFORE the delete so we can resync afterwards.
  const { data: entry, error: lookupErr } = await supabase
    .from("meal_plan_entries")
    .select("recipe_id")
    .eq("id", entryId)
    .maybeSingle();
  if (lookupErr) return { ok: false, error: lookupErr.message };
  if (!entry) return { ok: false, error: "Meal entry not found" };

  const recipeId = entry.recipe_id as string;
  console.log(`[remove] entry=${entryId.slice(0, 8)} recipe=${recipeId.slice(0, 8)}`);

  const { error } = await supabase
    .from("meal_plan_entries")
    .delete()
    .eq("id", entryId);
  if (error) {
    console.error("[remove] delete failed:", error);
    return { ok: false, error: error.message };
  }

  // Sanity-check the post-delete state — if the entry's still there, the
  // delete silently no-op'd (RLS or a stale id). Logged so we can spot it.
  const { count } = await supabase
    .from("meal_plan_entries")
    .select("*", { count: "exact", head: true })
    .eq("id", entryId);
  if ((count ?? 0) > 0) {
    console.error(`[remove] WARNING: entry ${entryId} still exists after delete (RLS?)`);
  }

  // Recompute the shopping list contribution. If no entries remain for this
  // recipe, syncRecipeToShoppingList drops the row from list_recipes.
  await syncRecipeToShoppingList(recipeId);

  revalidatePath("/plan");
  revalidatePath("/list");
  return { ok: true };
}

// Full rebuild — wipes any auto-synced rows on the active list and rebuilds
// them from the current meal-plan-entries. Use this when something got out
// of sync. Manually-added rows on the list (via "Add to shopping list" on a
// recipe detail page) are NOT preserved here, by design — the user's most
// recent intent is the meal plan.
export async function resyncShoppingListFromMealPlan(): Promise<
  ActionResult<{ recipesOnList: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const list = await getOrCreateActiveList();

  // Pull every meal_plan_entry the user has (RLS already scopes this to
  // their plans).
  const { data: allEntries, error: entErr } = await supabase
    .from("meal_plan_entries")
    .select("recipe_id, servings");
  if (entErr) return { ok: false, error: entErr.message };

  // Coalesce by recipe → total servings.
  const byRecipe = new Map<string, number>();
  for (const e of allEntries ?? []) {
    const rid = e.recipe_id as string;
    const s = Number(e.servings) || 0;
    byRecipe.set(rid, (byRecipe.get(rid) ?? 0) + s);
  }

  // Wipe the entire active list's recipe rows so stale ones disappear.
  const { error: delErr } = await supabase
    .from("list_recipes")
    .delete()
    .eq("list_id", list.id);
  if (delErr) {
    console.error("[resync] wipe list_recipes failed:", delErr);
    return { ok: false, error: delErr.message };
  }

  // Insert the canonical set.
  if (byRecipe.size > 0) {
    const rows = Array.from(byRecipe, ([recipe_id, servings]) => ({
      list_id: list.id,
      recipe_id,
      servings,
    }));
    const { error: insErr } = await supabase.from("list_recipes").insert(rows);
    if (insErr) {
      console.error("[resync] insert list_recipes failed:", insErr);
      return { ok: false, error: insErr.message };
    }
  }

  console.log(
    `[resync] list=${list.id.slice(0, 8)} recipes=${byRecipe.size}`,
  );
  revalidatePath("/list");
  revalidatePath("/plan");
  return { ok: true, recipesOnList: byRecipe.size };
}

// Adds every meal-plan entry in the given week onto the user's active
// shopping list. Same recipe on the list already? Upsert: keep the
// servings from the meal-plan entry (most recent intent wins).
export async function buildShoppingListFromWeek(
  weekStart: string,
): Promise<ActionResult<{ listId: string; addedCount: number }>> {
  if (!weekStart) return { ok: false, error: "Missing week" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Find the plan for the week. If there isn't one yet, nothing to add.
  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();
  if (planErr) return { ok: false, error: planErr.message };
  if (!plan) return { ok: false, error: "No meals planned this week" };

  const { data: entries, error: entErr } = await supabase
    .from("meal_plan_entries")
    .select("recipe_id, servings")
    .eq("meal_plan_id", plan.id);
  if (entErr) return { ok: false, error: entErr.message };
  if (!entries || entries.length === 0) {
    return { ok: false, error: "No meals planned this week" };
  }

  const list = await getOrCreateActiveList();

  // Coalesce duplicate recipes (e.g. pasta twice in the week) by max servings
  // so the bigger meal's worth of ingredients lands on the list.
  const byRecipe = new Map<string, number>();
  for (const e of entries) {
    const recipeId = e.recipe_id as string;
    const servings = e.servings as number;
    byRecipe.set(recipeId, Math.max(byRecipe.get(recipeId) ?? 0, servings));
  }

  const rows = Array.from(byRecipe, ([recipe_id, servings]) => ({
    list_id: list.id,
    recipe_id,
    servings,
  }));

  // Upsert so re-running the action updates the servings (and the trigger
  // only bumps usage_count on real inserts, not on conflict-update).
  const { error: upErr } = await supabase
    .from("list_recipes")
    .upsert(rows, { onConflict: "list_id,recipe_id" });
  if (upErr) return { ok: false, error: upErr.message };

  // Stamp the list so we know it came from this meal plan. Useful for
  // a future "rebuild from plan" affordance.
  await supabase
    .from("shopping_lists")
    .update({ source_meal_plan_id: plan.id })
    .eq("id", list.id);

  revalidatePath("/list");
  revalidatePath("/plan");
  return { ok: true, listId: list.id, addedCount: byRecipe.size };
}
