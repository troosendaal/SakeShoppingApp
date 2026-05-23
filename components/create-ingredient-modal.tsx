"use client";

import { Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import type { CategoryOption } from "@/lib/db/categories";
import type { IngredientLite, Locale, UnitType } from "@/lib/db/recipe-types";
import { createIngredient } from "@/app/(app)/ingredients-actions";

type ItemKind = "food" | "household";

export function CreateIngredientModal({
  open,
  onClose,
  onCreated,
  categories,
  locale,
  initialName = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ing: IngredientLite) => void;
  categories: CategoryOption[];
  locale: Locale;
  initialName?: string;
}) {
  // Pre-fill the EN name with whatever the user typed into the picker — saves
  // a step in the common case where they searched for an item that didn't
  // exist and are now creating it.
  const [nameEn, setNameEn] = useState(initialName);
  const [nameNl, setNameNl] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [aliasesEn, setAliasesEn] = useState("");
  const [aliasesNl, setAliasesNl] = useState("");
  const [aliasesFr, setAliasesFr] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [categoryId, setCategoryId] = useState(
    // Default to the "own" / Mes articles category if present, else first.
    categories.find((c) => c.slug === "own")?.id ?? categories[0]?.id ?? "",
  );
  const [itemKind, setItemKind] = useState<ItemKind>("food");
  const [unitType, setUnitType] = useState<UnitType>("count");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function splitAliases(s: string): string[] {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function categoryLabel(c: CategoryOption): string {
    if (locale === "nl") return c.name_nl;
    if (locale === "fr") return c.name_fr;
    return c.name_en;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createIngredient({
        name_en: nameEn,
        name_nl: nameNl,
        name_fr: nameFr,
        aliases_en: splitAliases(aliasesEn),
        aliases_nl: splitAliases(aliasesNl),
        aliases_fr: splitAliases(aliasesFr),
        emoji,
        category_id: categoryId,
        item_kind: itemKind,
        canonical_unit_type: unitType,
      });
      if (!r.ok) {
        setError(r.error);
      } else {
        onCreated(r.ingredient);
        onClose();
      }
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,24,20,.55)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 24,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: "var(--bg-paper)",
          borderRadius: 20,
          boxShadow: "var(--shadow)",
          maxWidth: 520,
          width: "100%",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid var(--line)",
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 className="serif" style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>
            New <em style={{ color: "var(--terracotta)" }}>ingredient.</em>
          </h3>
          <button
            type="button"
            onClick={onClose}
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

        <div
          style={{
            padding: "16px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-soft)",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={12} /> Names in all 3 languages keep cross-language
            search and merging working.
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 96px" }}>
              <Field label="Emoji">
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={4}
                  required
                  style={{ ...inputStyle, fontSize: 22, textAlign: "center" }}
                />
              </Field>
            </div>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <Field label="Category">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  style={inputStyle}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <Field label="Name (EN)">
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
              placeholder="Yellow onion"
              style={inputStyle}
            />
          </Field>
          <Field label="Aliases (EN, comma-separated)">
            <input
              value={aliasesEn}
              onChange={(e) => setAliasesEn(e.target.value)}
              placeholder="onion, onions"
              style={inputStyle}
            />
          </Field>

          <Field label="Name (NL)">
            <input
              value={nameNl}
              onChange={(e) => setNameNl(e.target.value)}
              required
              placeholder="Ui"
              style={inputStyle}
            />
          </Field>
          <Field label="Aliases (NL)">
            <input
              value={aliasesNl}
              onChange={(e) => setAliasesNl(e.target.value)}
              placeholder="uien, gele ui"
              style={inputStyle}
            />
          </Field>

          <Field label="Name (FR)">
            <input
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              required
              placeholder="Oignon"
              style={inputStyle}
            />
          </Field>
          <Field label="Aliases (FR)">
            <input
              value={aliasesFr}
              onChange={(e) => setAliasesFr(e.target.value)}
              placeholder="oignons, oignon jaune"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <Field label="Kind">
                <select
                  value={itemKind}
                  onChange={(e) => setItemKind(e.target.value as ItemKind)}
                  style={inputStyle}
                >
                  <option value="food">Food</option>
                  <option value="household">Household</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <Field label="Unit type">
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as UnitType)}
                  required
                  style={inputStyle}
                >
                  <option value="count">Count (whole, can, pack…)</option>
                  <option value="mass">Mass (g, kg, oz, lb)</option>
                  <option value="volume">Volume (ml, l, cup, tbsp)</option>
                </select>
              </Field>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "var(--terracotta-soft)",
                border: "1px solid var(--terracotta)",
                color: "var(--ink)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--bg-paper)",
            borderTop: "1px solid var(--line)",
            padding: "10px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create ingredient"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
  width: "100%",
  border: "1px solid var(--line)",
  background: "var(--bg-card)",
  borderRadius: 10,
  padding: "9px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
};
