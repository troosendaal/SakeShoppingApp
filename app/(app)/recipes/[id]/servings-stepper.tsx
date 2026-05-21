"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

type Ing = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes: string | null;
};

// Format a scaled quantity nicely: integers stay integers, otherwise up to 2 decimals.
function fmtQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  const rounded = Math.round(qty * 100) / 100;
  return rounded.toString();
}

export function ServingsStepper({
  baseServings,
  ingredients,
}: {
  baseServings: number;
  ingredients: Ing[];
}) {
  const [servings, setServings] = useState(baseServings);
  const factor = servings / baseServings;

  const scaled = useMemo(
    () =>
      ingredients.map((ing) => ({
        ...ing,
        scaledQty: ing.quantity * factor,
      })),
    [ingredients, factor],
  );

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
        <h3
          className="serif"
          style={{ fontSize: 22, fontWeight: 500, margin: 0 }}
        >
          Ingredients
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              style={{
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--ink-soft)",
              }}
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
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  fontStyle: "italic",
                }}
              >
                {ing.unit}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
