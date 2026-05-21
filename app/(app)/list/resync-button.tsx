"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resyncShoppingListFromMealPlan } from "@/app/(app)/plan/actions";

type Report = {
  activeListPrefix: string;
  mealPlanEntriesFound: number;
  uniqueRecipes: number;
  recipeTitles: string[];
};

// Fallback "Sync from meal plan" button. Wipes the active list's recipe
// rows and rebuilds them from current meal_plan_entries. After it runs,
// shows a verbose dialog with EXACTLY what it did, so "nothing happened"
// reports turn into "your meal plan was empty" (or surface real bugs).
export function ResyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      "Rebuild the recipe portion of this list from your meal plan?\n\n" +
        "This wipes any recipes auto-added before and re-adds them based " +
        "on what's currently planned. Manual ad-hoc items are NOT affected.",
    );
    if (!ok) return;
    setError(null);
    setReport(null);
    startTransition(async () => {
      const r = await resyncShoppingListFromMealPlan();
      if (!r.ok) {
        setError(r.error);
      } else {
        setReport({
          activeListPrefix: r.activeListPrefix,
          mealPlanEntriesFound: r.mealPlanEntriesFound,
          uniqueRecipes: r.uniqueRecipes,
          recipeTitles: r.recipeTitles,
        });
        router.refresh();
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className="btn btn-secondary"
          title="Force-rebuild the recipe rows from your meal plan"
        >
          <RefreshCw size={14} />
          {pending ? "Rebuilding…" : "Sync from meal plan"}
        </button>
        {error && (
          <span style={{ color: "var(--terracotta)", fontSize: 12 }}>
            {error}
          </span>
        )}
      </div>

      {report && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31,24,20,.55)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 24,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReport(null);
          }}
        >
          <div
            style={{
              background: "var(--bg-paper)",
              borderRadius: 18,
              boxShadow: "var(--shadow)",
              maxWidth: 460,
              width: "100%",
              padding: 24,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setReport(null)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-soft)",
              }}
            >
              <X size={16} />
            </button>
            <h3
              className="serif"
              style={{ margin: 0, fontWeight: 500, fontSize: 20 }}
            >
              Resync <em style={{ color: "var(--terracotta)" }}>complete.</em>
            </h3>
            <dl
              style={{
                marginTop: 16,
                fontSize: 13,
                color: "var(--ink-soft)",
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "6px 12px",
              }}
            >
              <dt>Active list</dt>
              <dd style={{ margin: 0, color: "var(--ink)", fontFamily: "monospace" }}>
                {report.activeListPrefix}…
              </dd>
              <dt>Meal-plan entries found</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>
                {report.mealPlanEntriesFound}
              </dd>
              <dt>Recipes now on list</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>
                {report.uniqueRecipes}
              </dd>
            </dl>
            {report.recipeTitles.length > 0 ? (
              <>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                  }}
                >
                  Added
                </div>
                <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 13 }}>
                  {report.recipeTitles.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  fontStyle: "italic",
                }}
              >
                Your meal plan has no entries — the recipe portion of the
                list is now empty. Add meals on the <strong>Meal plan</strong>{" "}
                tab and they'll auto-sync here.
              </p>
            )}
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setReport(null)}
                className="btn btn-primary"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
