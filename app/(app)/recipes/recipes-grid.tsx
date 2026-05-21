"use client";

import Link from "next/link";
import { Clock, Flame, Heart, Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { RecipeCardData } from "@/lib/db/recipe-types";

type SortKey = "popular" | "newest" | "alpha";

export function RecipesGrid({
  recipes,
  searchPlaceholder,
}: {
  recipes: RecipeCardData[];
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  // useDeferredValue so typing stays snappy on large recipe sets.
  const debouncedQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const base = !q
      ? recipes
      : (() => {
          const terms = q.split(/\s+/).filter(Boolean);
          return recipes.filter((r) =>
            terms.every((t) => r.search_haystack.includes(t)),
          );
        })();

    const sorted = base.slice();
    if (sort === "popular") {
      sorted.sort((a, b) => {
        if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
        return b.created_at.localeCompare(a.created_at);
      });
    } else if (sort === "newest") {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [recipes, debouncedQuery, sort]);

  return (
    <>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              fontWeight: 600,
            }}
            htmlFor="recipe-sort"
          >
            Sort
          </label>
          <select
            id="recipe-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              border: "1px solid var(--line)",
              background: "var(--bg-card)",
              padding: "8px 12px",
              borderRadius: 10,
              fontFamily: "inherit",
              fontSize: 13,
              outline: "none",
              boxShadow: "var(--shadow)",
            }}
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="alpha">A–Z</option>
          </select>
        </div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.usage_count > 0 && (
                      <span
                        title={`Added to a shopping list ${r.usage_count} time${r.usage_count === 1 ? "" : "s"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          color: "var(--terracotta)",
                          background: "rgba(255,255,255,.7)",
                          border: "1px solid var(--line)",
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        <Flame size={10} /> {r.usage_count}×
                      </span>
                    )}
                    <Heart size={14} />
                  </div>
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
