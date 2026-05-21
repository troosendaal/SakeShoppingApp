"use client";

import Link from "next/link";
import { Clock, Heart, Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { RecipeCardData } from "@/lib/db/recipe-types";

export function RecipesGrid({
  recipes,
  searchPlaceholder,
}: {
  recipes: RecipeCardData[];
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");
  // useDeferredValue so typing stays snappy on large recipe sets.
  const debouncedQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return recipes;
    // Support multi-word AND search ("pasta lemon" → both terms must hit).
    const terms = q.split(/\s+/).filter(Boolean);
    return recipes.filter((r) => terms.every((t) => r.search_haystack.includes(t)));
  }, [recipes, debouncedQuery]);

  return (
    <>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div /* placeholder so SearchBar floats right; the title lives in the parent server component */ />
        <div className="search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--line)",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
            color: "var(--ink-soft)",
            fontSize: 14,
            fontStyle: "italic",
          }}
        >
          No recipes match "{query}".
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="recipe-card"
              data-cat={r.meal_category}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cat-strip" />
              <div className="body">
                <div className="meta">
                  <span>{r.meal_category}</span>
                  <Heart size={14} />
                </div>
                <div className="hero">
                  <div className="hero-emoji">{r.hero_emoji}</div>
                  <div className="hero-times">
                    {r.prep_time_min != null && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Clock size={12} /> {r.prep_time_min} min
                      </div>
                    )}
                    <div>{r.base_servings} srv</div>
                  </div>
                </div>
                <h3 className="title serif">{r.title}</h3>
                {r.food_tags.length > 0 && (
                  <div className="tags">
                    {r.food_tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {r.ingredient_emojis.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      borderTop: "1px dashed var(--line)",
                      paddingTop: 8,
                      fontSize: 18,
                    }}
                  >
                    {r.ingredient_emojis.map((e, i) => (
                      <span key={i}>{e}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <Link
            href="/recipes/new"
            className="recipe-card"
            style={{
              borderStyle: "dashed",
              background: "transparent",
              boxShadow: "none",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="body"
              style={{
                background: "transparent",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Plus size={32} color="var(--ink-soft)" />
              <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                Add a new recipe
              </div>
            </div>
          </Link>
        </div>
      )}
    </>
  );
}
