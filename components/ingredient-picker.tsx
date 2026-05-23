"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type IngredientLite,
  type Locale,
  ingredientName,
} from "@/lib/db/recipe-types";
import type { CategoryOption } from "@/lib/db/categories";
import { CreateIngredientModal } from "./create-ingredient-modal";

// Reusable searchable ingredient combobox. Filters by EN/NL/FR name + emoji.
// Used in the recipe form and (eventually) anywhere else we need a picker.
export function IngredientPicker({
  ingredients,
  locale,
  value,
  onChange,
  placeholder = "Search ingredients…",
  required = false,
  categories,
}: {
  ingredients: IngredientLite[];
  locale: Locale;
  value: string; // ingredient_id, or "" if none
  onChange: (ingredientId: string, ingredient: IngredientLite | null) => void;
  placeholder?: string;
  required?: boolean;
  // If categories are supplied, the dropdown gets a "+ Create new
  // ingredient" footer that opens an inline create modal.
  categories?: CategoryOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const selected = useMemo(
    () => ingredients.find((i) => i.id === value) ?? null,
    [ingredients, value],
  );

  // `query` is what's typed; when the input is closed it shows the
  // selected ingredient's label, otherwise the user's current search.
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Click outside closes the dropdown
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 80);
    return ingredients
      .filter((i) => {
        const haystack =
          `${i.name_en} ${i.name_nl} ${i.name_fr} ${i.emoji}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 80);
  }, [query, ingredients]);

  function pick(ing: IngredientLite) {
    onChange(ing.id, ing);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onChange("", null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  // When the input is closed, show the selected ingredient's label as
  // placeholder-like text. When open, show what's being typed.
  const displayLabel = selected
    ? `${selected.emoji} ${ingredientName(selected, locale)}`
    : "";

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-paper)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          paddingRight: 8,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? query : displayLabel}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          // Keep "required" validation working: if nothing's picked, the
          // input value will be empty and the form blocks submit.
          required={required && !selected}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: 14,
            color: "var(--ink)",
          }}
        />
        {selected && !open ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear ingredient"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--ink-soft)",
              padding: 2,
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} color="var(--ink-soft)" />
        )}
      </div>

      {open && (matches.length > 0 || categories) && (
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
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 30,
          }}
        >
          {matches.map((ing) => {
            const isSelected = ing.id === value;
            return (
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
                  background: isSelected ? "var(--bg-paper)" : "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  textAlign: "left",
                  color: "var(--ink)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-paper)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "var(--bg-paper)"
                    : "transparent";
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
            );
          })}
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
          {categories && categories.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
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
          )}
        </div>
      )}

      {categories && (
        <CreateIngredientModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(ing) => {
            // Auto-select the freshly-created ingredient in the parent form
            // so the user doesn't have to search for it again.
            onChange(ing.id, ing);
            setQuery("");
          }}
          categories={categories}
          locale={locale}
          initialName={query}
        />
      )}
    </div>
  );
}
