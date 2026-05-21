import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MealCategory } from "./recipe-types";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type PlanEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  mealSlot: MealSlot;
  servings: number;
  position: number;
  recipe: {
    id: string;
    title: string;
    hero_emoji: string;
    meal_category: MealCategory;
    base_servings: number;
  };
};

export type WeekPlan = {
  planId: string | null;
  weekStart: string;
  entries: PlanEntry[];
};

// Get the user's meal plan for a given week. Doesn't create one yet — that
// happens lazily on the first entry insert.
export async function getMealPlanForWeek(weekStart: string): Promise<WeekPlan> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();
  if (planErr) throw planErr;

  if (!plan) return { planId: null, weekStart, entries: [] };

  const { data: entries, error: entErr } = await supabase
    .from("meal_plan_entries")
    .select(
      `id, date, meal_slot, servings, position,
       recipe:recipes (
         id, title, hero_emoji, meal_category, base_servings
       )`,
    )
    .eq("meal_plan_id", plan.id)
    .order("date", { ascending: true })
    .order("position", { ascending: true });
  if (entErr) throw entErr;

  type RawRecipe = {
    id: string;
    title: string;
    hero_emoji: string;
    meal_category: MealCategory;
    base_servings: number;
  };
  type RawRow = {
    id: string;
    date: string;
    meal_slot: MealSlot;
    servings: number;
    position: number;
    recipe: RawRecipe | RawRecipe[] | null;
  };

  const normalized: PlanEntry[] = ((entries ?? []) as unknown as RawRow[])
    .map((row) => {
      const recipe = Array.isArray(row.recipe) ? row.recipe[0] : row.recipe;
      if (!recipe) return null;
      return {
        id: row.id,
        date: row.date,
        mealSlot: row.meal_slot,
        servings: row.servings,
        position: row.position,
        recipe,
      };
    })
    .filter((x): x is PlanEntry => x != null);

  return { planId: plan.id, weekStart, entries: normalized };
}

// Lazily create the meal_plans row when we need to insert the first entry.
export async function getOrCreateMealPlan(weekStart: string): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: selErr } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return { id: existing.id as string };

  const { data: created, error: insErr } = await supabase
    .from("meal_plans")
    .insert({ user_id: user.id, week_start_date: weekStart })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return { id: created.id as string };
}
