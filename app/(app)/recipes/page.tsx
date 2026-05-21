import Link from "next/link";
import { Clock, Heart, Plus, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { getMyRecipes } from "@/lib/db/recipes";
import { errorMessage } from "@/lib/errors";

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
        <div className="search">
          <Search />
          <input placeholder={t("common.search")} disabled />
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
        <div className="recipe-grid">
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="recipe-card"
              data-cat={r.meal_category}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cat-strip" />
              <div className="body">
                <div className="meta">
                  <span>{r.meal_category}</span>
                  <Heart size={14} />
                </div>
                <div className="hero">
                  <div className="hero-emoji">{r.hero_emoji}</div>
                  <div className="hero-times">
                    {r.prep_time_min != null && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Clock size={12} /> {r.prep_time_min} min
                      </div>
                    )}
                    <div>{r.base_servings} srv</div>
                  </div>
                </div>
                <h3 className="title serif">{r.title}</h3>
                {r.food_tags.length > 0 && (
                  <div className="tags">
                    {r.food_tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {r.ingredient_emojis.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      borderTop: "1px dashed var(--line)",
                      paddingTop: 8,
                      fontSize: 18,
                    }}
                  >
                    {r.ingredient_emojis.map((e, i) => (
                      <span key={i}>{e}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <Link
            href="/recipes/new"
            className="recipe-card"
            style={{
              borderStyle: "dashed",
              background: "transparent",
              boxShadow: "none",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="body"
              style={{
                background: "transparent",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Plus size={32} color="var(--ink-soft)" />
              <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                Add a new recipe
              </div>
            </div>
          </Link>
        </div>
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

