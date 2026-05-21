import { createClient } from "@/lib/supabase/server";

export type Locale = "en" | "nl" | "fr";
export type MealCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "dessert"
  | "sweets"
  | "snack";
export type UnitType = "mass" | "volume" | "count";
export type ItemKind = "food" | "household";

export type IngredientLite = {
  id: string;
  emoji: string;
  name_en: string;
  name_nl: string;
  name_fr: string;
  category_id: string;
  canonical_unit_type: UnitType;
};

export type RecipeCardData = {
  id: string;
  title: string;
  hero_emoji: string;
  meal_category: MealCategory;
  food_tags: string[];
  base_servings: number;
  prep_time_min: number | null;
  lead_time_min: number | null;
  description: string | null;
  ingredient_emojis: string[]; // first ~5 ingredient emojis for the preview row
};

export type RecipeIngredientRow = {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  position: number;
  notes: string | null;
  ingredient: IngredientLite;
};

export type RecipeDetail = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  url: string | null;
  instructions: string | null;
  meal_category: MealCategory;
  food_tags: string[];
  base_servings: number;
  prep_time_min: number | null;
  lead_time_min: number | null;
  hero_emoji: string;
  ingredients: RecipeIngredientRow[];
};

// Choose the right localized name for an ingredient. Falls back to EN if the
// chosen language's column is somehow empty.
export function ingredientName(
  ing: Pick<IngredientLite, "name_en" | "name_nl" | "name_fr">,
  locale: Locale,
): string {
  if (locale === "nl" && ing.name_nl) return ing.name_nl;
  if (locale === "fr" && ing.name_fr) return ing.name_fr;
  return ing.name_en;
}

// All recipes owned by the logged-in user, newest first, with a tiny
// preview of ingredient emojis so the list cards have a visual hint.
export async function getMyRecipes(): Promise<RecipeCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `
      id, title, hero_emoji, meal_category, food_tags, base_servings,
      prep_time_min, lead_time_min, description,
      recipe_ingredients ( position, ingredients ( emoji ) )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((r) => {
    const ris = (r.recipe_ingredients ?? []) as Array<{
      position: number;
      ingredients: { emoji: string } | null;
    }>;
    const ingredient_emojis = ris
      .sort((a, b) => a.position - b.position)
      .map((ri) => ri.ingredients?.emoji)
      .filter((e): e is string => Boolean(e))
      .slice(0, 6);
    return {
      id: r.id as string,
      title: r.title as string,
      hero_emoji: r.hero_emoji as string,
      meal_category: r.meal_category as MealCategory,
      food_tags: (r.food_tags ?? []) as string[],
      base_servings: r.base_servings as number,
      prep_time_min: (r.prep_time_min ?? null) as number | null,
      lead_time_min: (r.lead_time_min ?? null) as number | null,
      description: (r.description ?? null) as string | null,
      ingredient_emojis,
    };
  });
}

export async function getRecipeWithIngredients(
  id: string,
): Promise<RecipeDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `
      id, owner_id, title, description, url, instructions, meal_category,
      food_tags, base_servings, prep_time_min, lead_time_min, hero_emoji,
      recipe_ingredients (
        id, ingredient_id, quantity, unit, is_optional, position, notes,
        ingredient:ingredients (
          id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type
        )
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const ingredients = ((data.recipe_ingredients ?? []) as RecipeIngredientRow[])
    .slice()
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id as string,
    owner_id: data.owner_id as string,
    title: data.title as string,
    description: (data.description ?? null) as string | null,
    url: (data.url ?? null) as string | null,
    instructions: (data.instructions ?? null) as string | null,
    meal_category: data.meal_category as MealCategory,
    food_tags: (data.food_tags ?? []) as string[],
    base_servings: data.base_servings as number,
    prep_time_min: (data.prep_time_min ?? null) as number | null,
    lead_time_min: (data.lead_time_min ?? null) as number | null,
    hero_emoji: data.hero_emoji as string,
    ingredients,
  };
}

// Used by the recipe form to populate the ingredient dropdown.
// Returns all ingredients the user can choose from — global seed + their own.
export async function listIngredients(): Promise<IngredientLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type")
    .order("name_en", { ascending: true });

  if (error) throw error;
  return (data ?? []) as IngredientLite[];
}

// Units the form picker offers. Grouped logically; the form just dumps them
// in one <select>. lib/units.ts in Phase 7 will gain real conversion.
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "fl_oz",
  "oz",
  "lb",
  "whole",
  "pinch",
  "bunch",
  "bulb",
  "clove",
  "can",
  "jar",
  "pack",
  "slice",
] as const;
export type Unit = (typeof UNITS)[number];

export const MEAL_CATEGORIES: MealCategory[] = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "sweets",
  "snack",
];
