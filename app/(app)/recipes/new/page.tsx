import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getLocale } from "next-intl/server";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { listIngredients } from "@/lib/db/recipes";
import { listCategories } from "@/lib/db/categories";
import type { Locale } from "@/lib/db/recipe-types";
import { errorMessage } from "@/lib/errors";
import { RecipeForm } from "./recipe-form";

export default async function NewRecipePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-head">
        <div>
          <h2>
            New <em>recipe.</em>
          </h2>
          <p>Connect Supabase first — see README.md.</p>
        </div>
      </div>
    );
  }

  const locale = ((await getLocale()) as Locale) ?? "en";

  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let loadError: string | null = null;
  try {
    [ingredients, categories] = await Promise.all([
      listIngredients(),
      listCategories(),
    ]);
  } catch (err) {
    console.error("[recipes/new] load failed:", err);
    loadError = errorMessage(err);
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/recipes"
          style={{
            color: "var(--ink-soft)",
            fontSize: 13,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ChevronLeft size={14} /> Recipes
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h2>
            New <em>recipe.</em>
          </h2>
          <p>Title, photo-less hero emoji, ingredients, and the basics.</p>
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
          Couldn't load ingredients: {loadError}
        </div>
      )}

      <RecipeForm
        ingredients={ingredients}
        categories={categories}
        locale={locale}
      />
    </>
  );
}
