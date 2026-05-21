"use client";

import { Check, Minus, Plus, ShoppingBasket } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { addRecipeToActiveList } from "@/app/(app)/list/actions";

type Ing = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes: string | null;
};

function fmtQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return (Math.round(qty * 100) / 100).toString();
}

export function ServingsStepper({
  recipeId,
  baseServings,
  ingredients,
}: {
  recipeId: string;
  baseServings: number;
  ingredients: Ing[];
}) {
  const [servings, setServings] = useState(baseServings);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "added" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const factor = servings / baseServings;
  const scaled = useMemo(
    () => ingredients.map((ing) => ({ ...ing, scaledQty: ing.quantity * factor })),
    [ingredients, factor],
  );

  function onAdd() {
    setFeedback("idle");
    setErrorMsg(null);
    startTransition(async () => {
      const result = await addRecipeToActiveList(recipeId, servings);
      if (result.ok) {
        setFeedback("added");
        setTimeout(() => setFeedback("idle"), 2200);
      } else {
        setFeedback("error");
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
          Ingredients
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Servings</span>
          <div className="qty-stepper">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              aria-label="Decrease servings"
            >
              <Minus size={12} />
            </button>
            <span className="num serif">{servings}</span>
            <button
              type="button"
              onClick={() => setServings((s) => s + 1)}
              aria-label="Increase servings"
            >
              <Plus size={12} />
            </button>
          </div>
          {servings !== baseServings && (
            <span
              className="serif"
              style={{ fontStyle: "italic", fontSize: 12, color: "var(--ink-soft)" }}
            >
              scaled from {baseServings}
            </span>
          )}
        </div>
      </div>

      <ul
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 0,
          margin: 0,
          listStyle: "none",
          boxShadow: "var(--shadow)",
        }}
      >
        {scaled.map((ing) => (
          <li
            key={ing.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderBottom: "1px dashed var(--line-soft)",
            }}
          >
            <span style={{ fontSize: 20 }}>{ing.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15 }}>
                {ing.name}
                {ing.is_optional && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ink-soft)",
                      border: "1px solid var(--line)",
                      borderRadius: 5,
                      padding: "1px 6px",
                    }}
                  >
                    optional
                  </span>
                )}
              </div>
              {ing.notes && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                    marginTop: 2,
                  }}
                >
                  {ing.notes}
                </div>
              )}
            </div>
            <div
              className="serif"
              style={{ fontSize: 15, color: "var(--ink)", minWidth: 90, textAlign: "right" }}
            >
              {fmtQty(ing.scaledQty)}{" "}
              <span style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic" }}>
                {ing.unit}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onAdd}
          disabled={isPending}
          className="btn btn-primary"
        >
          {feedback === "added" ? <Check /> : <ShoppingBasket />}
          {feedback === "added"
            ? "Added to list"
            : isPending
              ? "Adding…"
              : `Add to shopping list (${servings} srv)`}
        </button>
        {feedback === "error" && errorMsg && (
          <span style={{ color: "var(--terracotta)", fontSize: 12 }}>{errorMsg}</span>
        )}
      </div>
    </section>
  );
}
