"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type RecipePickerOption = {
  id: string;
  title: string;
  hero_emoji: string;
  base_servings: number;
  meal_category: string;
};

// Searchable combobox for picking a recipe. Mirrors IngredientPicker —
// filters across title + meal_category as you type.
export function RecipePicker({
  recipes,
  value,
  onChange,
  placeholder = "Search recipes…",
  required = false,
}: {
  recipes: RecipePickerOption[];
  value: string;
  onChange: (id: string, recipe: RecipePickerOption | null) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const selected = useMemo(
    () => recipes.find((r) => r.id === value) ?? null,
    [recipes, value],
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    if (!q) return recipes.slice(0, 80);
    return recipes
      .filter((r) =>
        `${r.title} ${r.meal_category} ${r.hero_emoji}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 80);
  }, [query, recipes]);

  function pick(r: RecipePickerOption) {
    onChange(r.id, r);
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
  const displayLabel = selected
    ? `${selected.hero_emoji} ${selected.title}`
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
            aria-label="Clear recipe"
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
      {open && matches.length > 0 && (
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
            zIndex: 200,
          }}
        >
          {matches.map((r) => {
            const isSelected = r.id === value;
            return (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
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
                <span style={{ fontSize: 22 }}>{r.hero_emoji}</span>
                <span style={{ flex: 1 }}>{r.title}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                  }}
                >
                  {r.meal_category}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && matches.length === 0 && (
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
            padding: "12px 14px",
            fontSize: 13,
            color: "var(--ink-soft)",
            fontStyle: "italic",
            zIndex: 200,
          }}
        >
          No recipes match "{query}".
        </div>
      )}
    </div>
  );
}
