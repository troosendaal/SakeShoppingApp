"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateActiveList } from "@/lib/db/shopping-list";
import { getOrCreateMealPlan, type MealSlot } from "@/lib/db/meal-plan";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const ALLOWED_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

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

  revalidatePath("/plan");
  return { ok: true, entryId: data.id };
}

export async function removeMealPlanEntry(
  entryId: string,
): Promise<ActionResult> {
  if (!entryId) return { ok: false, error: "Missing entry id" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("meal_plan_entries")
    .delete()
    .eq("id", entryId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/plan");
  return { ok: true };
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
