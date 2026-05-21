import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getLocale } from "next-intl/server";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { getRecipeWithIngredients, listIngredients } from "@/lib/db/recipes";
import type { Locale } from "@/lib/db/recipe-types";
import { errorMessage } from "@/lib/errors";
import { RecipeForm, type RecipeFormInitial } from "../../new/recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="page-head">
        <div>
          <h2>Edit recipe</h2>
          <p>Connect Supabase first — see README.md.</p>
        </div>
      </div>
    );
  }

  const locale = ((await getLocale()) as Locale) ?? "en";

  let initial: RecipeFormInitial | null = null;
  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];
  let loadError: string | null = null;

  try {
    const [recipe, allIngs] = await Promise.all([
      getRecipeWithIngredients(id),
      listIngredients(),
    ]);
    if (!recipe) notFound();
    ingredients = allIngs;
    initial = {
      recipeId: recipe.id,
      title: recipe.title,
      description: recipe.description ?? "",
      url: recipe.url ?? "",
      instructions: recipe.instructions ?? "",
      meal_category: recipe.meal_category,
      food_tags: recipe.food_tags,
      base_servings: recipe.base_servings,
      prep_time_min: recipe.prep_time_min,
      lead_time_min: recipe.lead_time_min,
      hero_emoji: recipe.hero_emoji,
      ingredients: recipe.ingredients.map((ri) => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ri.unit,
        is_optional: ri.is_optional,
      })),
    };
  } catch (err) {
    console.error("[recipes/edit] load failed:", err);
    loadError = errorMessage(err);
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/recipes/${id}`}
          style={{
            color: "var(--ink-soft)",
            fontSize: 13,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ChevronLeft size={14} /> Back to recipe
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h2>
            Edit <em>recipe.</em>
          </h2>
          <p>Change anything below and save.</p>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            background: "var(--terracotta-soft)",
            border: "1px solid var(--terracotta)",
            color: "var(--ink)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Couldn't load recipe: {loadError}
        </div>
      )}

      {initial && (
        <RecipeForm ingredients={ingredients} locale={locale} initial={initial} />
      )}
    </>
  );
}
