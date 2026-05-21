"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type IngredientLite,
  type Locale,
  ingredientName,
} from "@/lib/db/recipe-types";
import {
  matchIngredient,
  parseBulkIngredients,
} from "@/lib/parse-ingredients";

// Sensible default unit per canonical type, used when the parser couldn't
// extract a unit from the line ("milk" → ml, "6 eggs" → whole, "rice" → g).
const DEFAULT_UNIT_FOR_TYPE: Record<
  IngredientLite["canonical_unit_type"],
  string
> = {
  mass: "g",
  volume: "ml",
  count: "whole",
};

type Row = {
  ingredient_id: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
};

export function BulkIngredientInput({
  ingredients,
  locale,
  onAdd,
  onClose,
}: {
  ingredients: IngredientLite[];
  locale: Locale;
  onAdd: (rows: Row[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  const parsedItems = useMemo(() => {
    return parseBulkIngredients(text).map((p) => {
      const ing = matchIngredient(p.name, ingredients);
      const fallback = ing ? DEFAULT_UNIT_FOR_TYPE[ing.canonical_unit_type] : "whole";
      return {
        parsed: p,
        ingredient: ing,
        unit: p.unit ?? fallback,
      };
    });
  }, [text, ingredients]);

  const matched = parsedItems.filter((p) => p.ingredient);
  const unmatched = parsedItems.filter((p) => !p.ingredient);

  function confirm() {
    const rows: Row[] = matched.map((m) => ({
      ingredient_id: m.ingredient!.id,
      quantity: m.parsed.quantity,
      unit: m.unit,
      is_optional: false,
    }));
    onAdd(rows);
    onClose();
  }

  return (
    <div
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          <Sparkles size={14} /> Paste a list — one per line or comma-separated.
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-soft)",
            padding: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"2 onions\n200 g flour\n1 lemon, 6 eggs\n1 tbsp olive oil"}
        rows={6}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 12px",
          fontFamily: "inherit",
          fontSize: 14,
          outline: "none",
          background: "var(--bg-card)",
          resize: "vertical",
        }}
      />

      {parsedItems.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {matched.length > 0 && (
            <>
              <SectionLabel color="var(--olive)">
                MATCHED ({matched.length})
              </SectionLabel>
              {matched.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "4px 0",
                    fontSize: 13,
                  }}
                >
                  <Check size={14} color="var(--olive)" />
                  <span style={{ fontSize: 16 }}>{m.ingredient!.emoji}</span>
                  <span>
                    <strong>{m.parsed.quantity}</strong> {m.unit}{" "}
                    {ingredientName(m.ingredient!, locale)}
                  </span>
                  <span
                    style={{
                      color: "var(--ink-soft)",
                      fontStyle: "italic",
                      fontSize: 11,
                    }}
                  >
                    ← "{m.parsed.raw}"
                  </span>
                </div>
              ))}
            </>
          )}

          {unmatched.length > 0 && (
            <>
              <SectionLabel color="var(--terracotta)">
                NO MATCH — IGNORED ({unmatched.length})
              </SectionLabel>
              {unmatched.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "4px 0",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                  }}
                >
                  <X size={14} />
                  <span>{m.parsed.raw}</span>
                </div>
              ))}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  fontStyle: "italic",
                  marginTop: 4,
                }}
              >
                Tip: add unmatched items individually below — the form will
                let you create new ingredients on the fly (Phase 5+).
              </div>
            </>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={matched.length === 0}
          className="btn btn-primary"
        >
          Add {matched.length} ingredient{matched.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        color,
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}
