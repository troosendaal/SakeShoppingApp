"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { IngredientLite, Locale } from "@/lib/db/recipe-types";
import { ingredientName, UNITS } from "@/lib/db/recipe-types";
import { addAdhocItem } from "./actions";

// Pick a sensible default unit for an ingredient's canonical unit type.
const DEFAULT_UNIT: Record<IngredientLite["canonical_unit_type"], string> = {
  mass: "g",
  volume: "ml",
  count: "whole",
};

export function QuickAdd({
  ingredients,
  locale,
  singleLabel,
  bulkLabel,
  addLabel,
}: {
  ingredients: IngredientLite[];
  locale: Locale;
  singleLabel: string;
  bulkLabel: string;
  addLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("whole");
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 8);
    const filtered = ingredients.filter((i) => {
      const haystack = `${i.name_en} ${i.name_nl} ${i.name_fr}`.toLowerCase();
      return haystack.includes(q);
    });
    return filtered.slice(0, 8);
  }, [query, ingredients]);

  function pick(ing: IngredientLite) {
    setSelectedId(ing.id);
    setQuery(`${ing.emoji} ${ingredientName(ing, locale)}`);
    setUnit(DEFAULT_UNIT[ing.canonical_unit_type]);
    setShowDropdown(false);
    setError(null);
  }

  function reset() {
    setSelectedId(null);
    setQuery("");
    setQuantity("1");
    setUnit("whole");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedId) {
      setError("Pick an ingredient from the list");
      return;
    }
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Quantity must be positive");
      return;
    }
    startTransition(async () => {
      const r = await addAdhocItem(selectedId, q, unit);
      if (!r.ok) setError(r.error);
      else reset();
    });
  }

  return (
    <div className="quick-add">
      <form onSubmit={onSubmit} className="quick-add-row">
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
            placeholder="Add an item…"
            style={{ width: "100%" }}
          />
          {showDropdown && matches.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--bg-card)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                boxShadow: "var(--shadow)",
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              {matches.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(ing)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-paper)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{ing.emoji}</span>
                  <span style={{ flex: 1 }}>{ingredientName(ing, locale)}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic" }}>
                    {ing.canonical_unit_type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          step="0.1"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{ width: 70, flex: "0 0 auto" }}
          placeholder="qty"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={{
            border: "none",
            background: "var(--bg-paper)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            flex: "0 0 auto",
          }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <div className="qa-mode-toggle">
          <button type="button" className="active">
            {singleLabel}
          </button>
          <button type="button" title="Bulk paste — coming in the next commit">
            {bulkLabel}
          </button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Plus /> {pending ? "Adding…" : addLabel}
        </button>
      </form>
      {error && (
        <div style={{ marginTop: 8, color: "var(--terracotta)", fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
