"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resyncShoppingListFromMealPlan } from "@/app/(app)/plan/actions";

// Fallback "Sync from meal plan" button. Wipes the active list's recipe
// rows and rebuilds them from current meal_plan_entries. Useful if the
// per-action sync ever drifted (we shouldn't see this in normal use — file
// a Vercel-logs report if you do).
export function ResyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      "Rebuild the recipe portion of this list from your meal plan?\n\n" +
        "This wipes any recipes auto-added before and re-adds them based " +
        "on what's currently planned. Manual adhoc items are NOT affected.",
    );
    if (!ok) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const r = await resyncShoppingListFromMealPlan();
      if (!r.ok) {
        setError(r.error);
      } else {
        setFeedback(
          `Rebuilt: ${r.recipesOnList} recipe${r.recipesOnList === 1 ? "" : "s"} on the list`,
        );
        setTimeout(() => setFeedback(null), 2500);
        router.refresh();
      }
    });
  }

  return (
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
      {feedback && (
        <span style={{ color: "var(--olive)", fontSize: 12 }}>{feedback}</span>
      )}
      {error && (
        <span style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</span>
      )}
    </div>
  );
}
