import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Edit3,
  ExternalLink,
  Hourglass,
  Users,
} from "lucide-react";
import { getLocale } from "next-intl/server";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { getRecipeWithIngredients } from "@/lib/db/recipes";
import { ingredientName, type Locale } from "@/lib/db/recipe-types";
import { DeleteRecipeButton } from "./delete-button";
import { ServingsStepper } from "./servings-stepper";

const CATEGORY_GRADIENT: Record<string, string> = {
  breakfast: "linear-gradient(180deg, var(--honey-soft), #fff 80%)",
  lunch: "linear-gradient(180deg, var(--olive-soft), #fff 80%)",
  dinner: "linear-gradient(180deg, var(--terracotta-soft), #fff 80%)",
  dessert: "linear-gradient(180deg, var(--rose-soft), #fff 80%)",
  sweets: "linear-gradient(180deg, var(--plum-soft), #fff 80%)",
  snack: "linear-gradient(180deg, var(--slate-soft), #fff 80%)",
};

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-head">
        <div>
          <h2>Recipe</h2>
          <p>Connect Supabase first — see README.md.</p>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const locale = ((await getLocale()) as Locale) ?? "en";
  const recipe = await getRecipeWithIngredients(id);
  if (!recipe) notFound();

  // Prepare serializable ingredient data for the client component.
  const ingredientData = recipe.ingredients.map((ri) => ({
    id: ri.id,
    name: ingredientName(ri.ingredient, locale),
    emoji: ri.ingredient.emoji,
    quantity: ri.quantity,
    unit: ri.unit,
    is_optional: ri.is_optional,
    notes: ri.notes,
  }));

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: 24,
        }}
      >
        {/* Hero column */}
        <aside
          style={{
            background:
              CATEGORY_GRADIENT[recipe.meal_category] ?? CATEGORY_GRADIENT.dinner,
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: 28,
            boxShadow: "var(--shadow)",
            position: "sticky",
            top: 24,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {recipe.meal_category}
          </div>
          {recipe.food_tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
              {recipe.food_tags.map((tag) => (
                <span
                  key={tag}
                  className="tag"
                  style={{ background: "rgba(255,255,255,.7)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 140, lineHeight: 1, textAlign: "center", margin: "20px 0" }}>
            {recipe.hero_emoji}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              padding: "16px 0 4px",
              borderTop: "1px dashed var(--line)",
            }}
          >
            <Stat
              icon={<Clock size={16} />}
              value={recipe.prep_time_min != null ? `${recipe.prep_time_min}` : "—"}
              label="prep min"
            />
            <Stat
              icon={<Hourglass size={16} />}
              value={recipe.lead_time_min != null ? `${recipe.lead_time_min}` : "—"}
              label="lead min"
            />
            <Stat
              icon={<Users size={16} />}
              value={`${recipe.base_servings}`}
              label="base srv"
            />
          </div>
        </aside>

        {/* Content column */}
        <div>
          <h1
            className="serif"
            style={{
              fontSize: 44,
              fontWeight: 400,
              letterSpacing: "-0.025em",
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            {recipe.title}
          </h1>
          {recipe.description && (
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: 15,
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              {recipe.description}
            </p>
          )}
          {recipe.url && (
            <a
              href={recipe.url}
              target="_blank"
              rel="noopener"
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--terracotta)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={12} /> Original source
            </a>
          )}

          <ServingsStepper
            recipeId={recipe.id}
            baseServings={recipe.base_servings}
            ingredients={ingredientData}
          />

          {recipe.instructions && (
            <section style={{ marginTop: 32 }}>
              <h3
                className="serif"
                style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px" }}
              >
                Instructions
              </h3>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--ink)",
                }}
              >
                {recipe.instructions}
              </div>
            </section>
          )}

          <section
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px dashed var(--line)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-secondary">
              <Edit3 size={14} /> Edit
            </Link>
            <DeleteRecipeButton recipeId={recipe.id} recipeTitle={recipe.title} />
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          color: "var(--ink-soft)",
        }}
      >
        {icon}
      </div>
      <div
        className="serif"
        style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, marginTop: 4 }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
