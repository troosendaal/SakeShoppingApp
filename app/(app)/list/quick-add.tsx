"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { IngredientLite, Locale } from "@/lib/db/recipe-types";
import { ingredientName, UNITS } from "@/lib/db/recipe-types";
import type { CategoryOption } from "@/lib/db/categories";
import { CreateIngredientModal } from "@/components/create-ingredient-modal";
import {
  matchIngredient,
  parseBulkIngredients,
} from "@/lib/parse-ingredients";
import { addAdhocItem, addBulkAdhocItems } from "./actions";

type Mode = "single" | "bulk";

// Pick a sensible default unit for an ingredient's canonical unit type.
const DEFAULT_UNIT: Record<IngredientLite["canonical_unit_type"], string> = {
  mass: "g",
  volume: "ml",
  count: "whole",
};

export function QuickAdd({
  ingredients,
  categories,
  locale,
  singleLabel,
  bulkLabel,
  addLabel,
}: {
  ingredients: IngredientLite[];
  categories: CategoryOption[];
  locale: Locale;
  singleLabel: string;
  bulkLabel: string;
  addLabel: string;
}) {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="quick-add">
      <div
        className="qa-mode-toggle"
        style={{ marginBottom: 10, display: "inline-flex" }}
      >
        <button
          type="button"
          className={mode === "single" ? "active" : ""}
          onClick={() => setMode("single")}
        >
          {singleLabel}
        </button>
        <button
          type="button"
          className={mode === "bulk" ? "active" : ""}
          onClick={() => setMode("bulk")}
        >
          {bulkLabel}
        </button>
      </div>
      {mode === "single" ? (
        <SingleAdd
          ingredients={ingredients}
          categories={categories}
          locale={locale}
          addLabel={addLabel}
        />
      ) : (
        <BulkAdd
          ingredients={ingredients}
          locale={locale}
          addLabel={addLabel}
        />
      )}
    </div>
  );
}

function SingleAdd({
  ingredients,
  categories,
  locale,
  addLabel,
}: {
  ingredients: IngredientLite[];
  categories: CategoryOption[];
  locale: Locale;
  addLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("whole");
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 8);
    return ingredients
      .filter((i) =>
        `${i.name_en} ${i.name_nl} ${i.name_fr}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
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
      else {
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
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
          {showDropdown && (
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
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-soft)",
                      fontStyle: "italic",
                    }}
                  >
                    {ing.canonical_unit_type}
                  </span>
                </button>
              ))}
              {matches.length === 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                  }}
                >
                  {query
                    ? `No ingredients match "${query}".`
                    : "No ingredients yet."}
                </div>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowDropdown(false);
                  setCreateOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderTop: "1px solid var(--line)",
                  background: "var(--bg-paper)",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  color: "var(--terracotta)",
                  fontWeight: 500,
                }}
              >
                <Plus size={14} />{" "}
                {query
                  ? `Create "${query}" as a new ingredient`
                  : "Create new ingredient"}
              </button>
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
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Plus /> {pending ? "Adding…" : addLabel}
        </button>
      </form>
      {error && (
        <div style={{ marginTop: 8, color: "var(--terracotta)", fontSize: 12 }}>
          {error}
        </div>
      )}
      <CreateIngredientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ing) => {
          // Auto-select the freshly-created ingredient so the user can
          // just hit "Add" without searching again.
          pick(ing);
          router.refresh();
        }}
        categories={categories}
        locale={locale}
        initialName={query}
      />
    </>
  );
}

// Bulk paste: textarea → parser → matcher → server insert. Shows a live
// preview of matched / unmatched items as the user types.
function BulkAdd({
  ingredients,
  locale,
  addLabel: _addLabel,
}: {
  ingredients: IngredientLite[];
  locale: Locale;
  addLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedItems = useMemo(() => {
    return parseBulkIngredients(text).map((p) => {
      const ing = matchIngredient(p.name, ingredients);
      const fallback = ing
        ? DEFAULT_UNIT[ing.canonical_unit_type]
        : "whole";
      return {
        parsed: p,
        ingredient: ing,
        unit: p.unit ?? fallback,
      };
    });
  }, [text, ingredients]);

  const matched = parsedItems.filter((p) => p.ingredient);
  const unmatched = parsedItems.filter((p) => !p.ingredient);

  function submit() {
    setError(null);
    setFeedback(null);
    if (matched.length === 0) {
      setError("Nothing to add — none of those names match an ingredient.");
      return;
    }
    const rows = matched.map((m) => ({
      ingredient_id: m.ingredient!.id,
      quantity: m.parsed.quantity,
      unit: m.unit,
    }));
    startTransition(async () => {
      const r = await addBulkAdhocItems(rows);
      if (!r.ok) {
        setError(r.error);
      } else {
        const msg = unmatched.length
          ? `Added ${r.addedCount}. ${unmatched.length} couldn't be matched and were skipped.`
          : `Added ${r.addedCount} item${r.addedCount === 1 ? "" : "s"}.`;
        setFeedback(msg);
        setText("");
        router.refresh();
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "2 avocados\n6 eggs, toilet paper\n200 g flour, 1 lemon"
        }
        rows={5}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          background: "var(--bg-paper)",
          borderRadius: 10,
          padding: "10px 14px",
          fontFamily: "inherit",
          fontSize: 14,
          outline: "none",
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />

      {(matched.length > 0 || unmatched.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-soft)" }}>
          {matched.length > 0 && (
            <div>
              <strong style={{ color: "var(--olive)" }}>✓ {matched.length} matched:</strong>{" "}
              {matched
                .map(
                  (m) =>
                    `${m.parsed.quantity} ${m.unit} ${ingredientName(m.ingredient!, locale)}`,
                )
                .join(", ")}
            </div>
          )}
          {unmatched.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: "var(--terracotta)" }}>
                ✗ {unmatched.length} no match:
              </strong>{" "}
              {unmatched.map((u) => u.parsed.raw).join(", ")}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
        }}
      >
        {feedback && (
          <span style={{ color: "var(--olive)", fontSize: 12 }}>{feedback}</span>
        )}
        {error && (
          <span style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || matched.length === 0}
          className="btn btn-primary"
        >
          <Plus />{" "}
          {pending
            ? "Adding…"
            : `Add ${matched.length} item${matched.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
