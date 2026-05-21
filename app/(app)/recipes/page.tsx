import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { getMyRecipes } from "@/lib/db/recipes";
import { errorMessage } from "@/lib/errors";
import { RecipesGrid } from "./recipes-grid";

export default async function RecipesPage() {
  const t = await getTranslations();
  const showBanner = !isSupabaseConfigured();

  let recipes: Awaited<ReturnType<typeof getMyRecipes>> = [];
  let loadError: string | null = null;
  if (!showBanner) {
    try {
      recipes = await getMyRecipes();
    } catch (err) {
      console.error("[recipes] getMyRecipes failed:", err);
      loadError = errorMessage(err);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.recipes.title")} <em>{t("pages.recipes.titleEm")}</em>
          </h2>
          <p>{t("pages.recipes.subtitle")}</p>
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}
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
          Couldn't load recipes: {loadError}
        </div>
      )}

      {recipes.length === 0 && !showBanner && !loadError ? (
        <EmptyState />
      ) : (
        <RecipesGrid recipes={recipes} searchPlaceholder={t("common.search")} />
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px dashed var(--line)",
        borderRadius: 18,
        padding: 48,
        textAlign: "center",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ fontSize: 56 }}>📖</div>
      <h3 className="serif" style={{ marginTop: 12, fontWeight: 400, fontSize: 24 }}>
        No recipes yet
      </h3>
      <p style={{ color: "var(--ink-soft)", marginTop: 4, fontSize: 14 }}>
        Add your first recipe to start planning meals and shopping lists.
      </p>
      <Link
        href="/recipes/new"
        className="btn btn-primary"
        style={{ marginTop: 20, display: "inline-flex" }}
      >
        <Plus /> Add a recipe
      </Link>
    </div>
  );
}
