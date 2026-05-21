import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  IngredientLite,
  MealCategory,
  RecipeCardData,
  RecipeDetail,
  RecipeIngredientRow,
} from "./recipe-types";

// All recipes owned by the logged-in user, newest first, with a tiny
// preview of ingredient emojis for the list cards.
export async function getMyRecipes(): Promise<RecipeCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `
      id, title, hero_emoji, meal_category, food_tags, base_servings,
      prep_time_min, lead_time_min, description,
      recipe_ingredients (
        position,
        ingredients ( emoji, name_en, name_nl, name_fr )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  type RawIng = {
    emoji: string;
    name_en: string;
    name_nl: string;
    name_fr: string;
  };
  type RawRI = {
    position: number;
    ingredients: RawIng | RawIng[] | null;
  };

  return data.map((r) => {
    const ris = (r.recipe_ingredients ?? []) as unknown as RawRI[];
    const flat = ris
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((ri) => {
        if (!ri.ingredients) return null;
        return Array.isArray(ri.ingredients) ? ri.ingredients[0] : ri.ingredients;
      })
      .filter((i): i is RawIng => Boolean(i));

    const ingredient_emojis = flat
      .map((i) => i.emoji)
      .filter((e): e is string => Boolean(e))
      .slice(0, 6);

    // Searchable haystack for the client-side filter: title + every
    // ingredient name in all 3 languages + food tags, all lowercased.
    const title = (r.title as string) ?? "";
    const tags = ((r.food_tags ?? []) as string[]).join(" ");
    const ingNames = flat
      .flatMap((i) => [i.name_en, i.name_nl, i.name_fr])
      .filter(Boolean)
      .join(" ");
    const search_haystack = `${title} ${tags} ${ingNames}`.toLowerCase();

    return {
      id: r.id as string,
      title,
      hero_emoji: r.hero_emoji as string,
      meal_category: r.meal_category as MealCategory,
      food_tags: (r.food_tags ?? []) as string[],
      base_servings: r.base_servings as number,
      prep_time_min: (r.prep_time_min ?? null) as number | null,
      lead_time_min: (r.lead_time_min ?? null) as number | null,
      description: (r.description ?? null) as string | null,
      ingredient_emojis,
      search_haystack,
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

  // Same array/object inference dance as getMyRecipes — Supabase may type
  // the nested `ingredient` relation as either shape. Normalise to a single
  // object before we sort/return.
  type RawRow = Omit<RecipeIngredientRow, "ingredient"> & {
    ingredient: IngredientLite | IngredientLite[] | null;
  };
  const rawRows = (data.recipe_ingredients ?? []) as unknown as RawRow[];
  const ingredients: RecipeIngredientRow[] = rawRows
    .map((r) => ({
      ...r,
      ingredient: Array.isArray(r.ingredient)
        ? (r.ingredient[0] as IngredientLite)
        : (r.ingredient as IngredientLite),
    }))
    .filter((r) => r.ingredient != null)
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
// Returns the global seed + the user's own ingredients.
export async function listIngredients(): Promise<IngredientLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type")
    .order("name_en", { ascending: true });

  if (error) throw error;
  return (data ?? []) as IngredientLite[];
}
