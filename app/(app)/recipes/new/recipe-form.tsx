"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type IngredientLite,
  type Locale,
  ingredientName,
  MEAL_CATEGORIES,
  UNITS,
} from "@/lib/db/recipe-types";
import { createRecipe, updateRecipe } from "../actions";

type IngRow = {
  ingredient_id: string;
  quantity: string;
  unit: string;
  is_optional: boolean;
};

export type RecipeFormInitial = {
  recipeId: string; // presence flips the form into update mode
  title: string;
  description: string;
  url: string;
  instructions: string;
  meal_category: (typeof MEAL_CATEGORIES)[number];
  food_tags: string[];
  base_servings: number;
  prep_time_min: number | null;
  lead_time_min: number | null;
  hero_emoji: string;
  ingredients: Array<{
    ingredient_id: string;
    quantity: number;
    unit: string;
    is_optional: boolean;
  }>;
};

const CATEGORY_EMOJI: Record<string, string> = {
  breakfast: "🥚",
  lunch: "🥗",
  dinner: "🍝",
  dessert: "🍰",
  sweets: "🍪",
  snack: "🥨",
};

export function RecipeForm({
  ingredients,
  locale,
  initial,
}: {
  ingredients: IngredientLite[];
  locale: Locale;
  initial?: RecipeFormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial?.recipeId;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [mealCategory, setMealCategory] = useState<
    (typeof MEAL_CATEGORIES)[number]
  >(initial?.meal_category ?? "dinner");
  const [foodTagsText, setFoodTagsText] = useState(
    initial?.food_tags?.join(", ") ?? "",
  );
  const [baseServings, setBaseServings] = useState(initial?.base_servings ?? 4);
  const [prepTime, setPrepTime] = useState<number | "">(
    initial?.prep_time_min ?? "",
  );
  const [leadTime, setLeadTime] = useState<number | "">(
    initial?.lead_time_min ?? "",
  );
  const [heroEmoji, setHeroEmoji] = useState(initial?.hero_emoji ?? "🍝");
  const [rows, setRows] = useState<IngRow[]>(
    initial?.ingredients?.length
      ? initial.ingredients.map((i) => ({
          ingredient_id: i.ingredient_id,
          quantity: String(i.quantity),
          unit: i.unit,
          is_optional: i.is_optional,
        }))
      : [{ ingredient_id: "", quantity: "", unit: "g", is_optional: false }],
  );

  function updateRow(i: number, patch: Partial<IngRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { ingredient_id: "", quantity: "", unit: "g", is_optional: false },
    ]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanIngredients = rows
      .filter((r) => r.ingredient_id && r.quantity)
      .map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: Number(r.quantity),
        unit: r.unit,
        is_optional: r.is_optional,
      }));

    if (cleanIngredients.length === 0) {
      setError("Add at least one ingredient with a quantity.");
      return;
    }

    const food_tags = foodTagsText
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      title,
      description: description || null,
      url: url || null,
      instructions: instructions || null,
      meal_category: mealCategory,
      food_tags,
      base_servings: baseServings,
      prep_time_min: prepTime === "" ? null : prepTime,
      lead_time_min: leadTime === "" ? null : leadTime,
      hero_emoji: heroEmoji || "🍽️",
      source_language: locale,
      ingredients: cleanIngredients,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateRecipe(initial!.recipeId, payload)
        : await createRecipe(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/recipes/${result.recipeId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Basics */}
      <Card title="Basics">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pasta al limone"
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A bright, lemony pasta — fast weeknight dinner."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
        <Field label="Hero emoji">
          <input
            value={heroEmoji}
            onChange={(e) => setHeroEmoji(e.target.value)}
            maxLength={4}
            style={{ ...inputStyle, fontSize: 24, width: 80, textAlign: "center" }}
          />
        </Field>
        <Field label="Meal category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MEAL_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setMealCategory(c);
                  if (!heroEmoji || heroEmoji === CATEGORY_EMOJI[mealCategory]) {
                    setHeroEmoji(CATEGORY_EMOJI[c]);
                  }
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1.5px solid ${mealCategory === c ? "var(--ink)" : "var(--line)"}`,
                  background: mealCategory === c ? "var(--ink)" : "var(--bg-paper)",
                  color: mealCategory === c ? "var(--bg)" : "var(--ink)",
                  fontSize: 13,
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Field label="Base servings">
            <input
              type="number"
              min={1}
              value={baseServings}
              onChange={(e) => setBaseServings(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="Prep (min)">
            <input
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) =>
                setPrepTime(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={inputStyle}
            />
          </Field>
          <Field label="Lead time (min)">
            <input
              type="number"
              min={0}
              value={leadTime}
              onChange={(e) =>
                setLeadTime(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Food tags (comma-separated)">
          <input
            value={foodTagsText}
            onChange={(e) => setFoodTagsText(e.target.value)}
            placeholder="pasta, veggie, quick"
            style={inputStyle}
          />
        </Field>
        <Field label="Source URL (optional)">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </Field>
      </Card>

      {/* Ingredients */}
      <Card title="Ingredients">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px 100px auto auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <select
                value={row.ingredient_id}
                onChange={(e) => updateRow(i, { ingredient_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">— pick an ingredient —</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.emoji} {ingredientName(ing, locale)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="qty"
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: e.target.value })}
                style={inputStyle}
                required
              />
              <select
                value={row.unit}
                onChange={(e) => updateRow(i, { unit: e.target.value })}
                style={inputStyle}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--ink-soft)",
                }}
              >
                <input
                  type="checkbox"
                  checked={row.is_optional}
                  onChange={(e) => updateRow(i, { is_optional: e.target.checked })}
                />
                optional
              </label>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove ingredient"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--bg-paper)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} color="var(--ink-soft)" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
        >
          <Plus /> Add ingredient
        </button>
      </Card>

      {/* Instructions */}
      <Card title="Instructions (optional)">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="1. Boil water…"
          rows={8}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </Card>

      {error && (
        <div
          style={{
            background: "var(--terracotta-soft)",
            border: "1px solid var(--terracotta)",
            color: "var(--ink)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            router.push(isEdit ? `/recipes/${initial!.recipeId}` : "/recipes")
          }
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Save recipe"}
        </button>
      </div>
    </form>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 20,
        boxShadow: "var(--shadow)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h3 className="serif" style={{ margin: 0, fontWeight: 500, fontSize: 18 }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-paper)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  width: "100%",
};
