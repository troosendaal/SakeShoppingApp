import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getLocale } from "next-intl/server";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { listIngredients, type Locale } from "@/lib/db/recipes";
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
  const ingredients = await listIngredients();

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

      <RecipeForm ingredients={ingredients} locale={locale} />
    </>
  );
}
