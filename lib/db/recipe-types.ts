// Pure types + constants for recipes. No server imports — safe to bring into
// Client Components. The server-only DB helpers live in ./recipes.ts.

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
  ingredient_emojis: string[];
  // Lowercased searchable haystack: title + ingredient names in all 3 langs
  // + food tags. Built server-side so the client filter is just a string
  // contains check.
  search_haystack: string;
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

// Localised ingredient-name picker. Pure function — safe in client + server.
export function ingredientName(
  ing: Pick<IngredientLite, "name_en" | "name_nl" | "name_fr">,
  locale: Locale,
): string {
  if (locale === "nl" && ing.name_nl) return ing.name_nl;
  if (locale === "fr" && ing.name_fr) return ing.name_fr;
  return ing.name_en;
}

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
