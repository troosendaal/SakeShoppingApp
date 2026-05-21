"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addMealPlanEntry } from "./actions";
import type { MealSlot } from "@/lib/db/meal-plan";
import {
  RecipePicker,
  type RecipePickerOption,
} from "@/components/recipe-picker";

type RecipeOption = RecipePickerOption;

// Map recipe.meal_category → the most natural meal_plan slot. (Recipe
// categories include dessert/sweets/snack which all default to "snack".)
function defaultSlotFor(cat: string): MealSlot {
  if (cat === "breakfast") return "breakfast";
  if (cat === "lunch") return "lunch";
  if (cat === "dinner") return "dinner";
  return "snack";
}

export function AddMealButton({
  weekStart,
  date,
  defaultSlot,
  recipes,
  variant = "empty",
}: {
  weekStart: string;
  date: string;
  defaultSlot?: MealSlot;
  recipes: RecipeOption[];
  variant?: "empty" | "small";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [recipeId, setRecipeId] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot ?? "dinner");
  const [servings, setServings] = useState(4);
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    setRecipeId(id);
    const r = recipes.find((x) => x.id === id);
    if (r) {
      setServings(r.base_servings);
      setSlot(defaultSlot ?? defaultSlotFor(r.meal_category));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await addMealPlanEntry({
        weekStart,
        date,
        mealSlot: slot,
        recipeId,
        servings,
      });
      if (!r.ok) {
        setError(r.error);
      } else {
        setOpen(false);
        setRecipeId("");
        router.refresh();
      }
    });
  }

  return (
    <>
      {variant === "empty" ? (
        <button type="button" className="slot-empty" onClick={() => setOpen(true)}>
          <Plus
            style={{
              width: 14,
              height: 14,
              display: "inline-block",
              verticalAlign: "middle",
              marginRight: 3,
            }}
          />{" "}
          add meal
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            border: "1px dashed var(--line)",
            background: "transparent",
            color: "var(--ink-soft)",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Plus size={11} /> meal
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31,24,20,.55)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 24,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            style={{
              background: "var(--bg-paper)",
              borderRadius: 24,
              boxShadow: "var(--shadow)",
              maxWidth: 460,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderBottom: "1px solid var(--line)",
                padding: "16px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 className="serif" style={{ fontWeight: 500, fontSize: 20, margin: 0 }}>
                Add <em style={{ color: "var(--terracotta)" }}>meal.</em>
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X />
              </button>
            </div>

            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <FieldLabel>Recipe</FieldLabel>
              <RecipePicker
                recipes={recipes}
                value={recipeId}
                onChange={(id) => pick(id)}
                placeholder="Search recipes…"
                required
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FieldLabel>Meal slot</FieldLabel>
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value as MealSlot)}
                    style={selectStyle}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack / dessert</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Servings</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    style={selectStyle}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</div>
              )}
            </div>

            <div
              style={{
                background: "var(--bg-paper)",
                borderTop: "1px solid var(--line)",
                padding: "12px 22px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={pending || !recipeId}
              >
                {pending ? "Adding…" : "Add to day"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink-soft)",
        display: "block",
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  background: "var(--bg-paper)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
};
