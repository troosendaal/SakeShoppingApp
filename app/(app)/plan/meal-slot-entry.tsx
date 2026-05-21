"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { MealSlot, PlanEntry } from "@/lib/db/meal-plan";
import { updateMealPlanEntryServings } from "./actions";
import { RemoveEntryButton } from "./remove-entry";

const SLOT_CAT: Record<MealSlot, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
};

// One scheduled meal. The "N servings" label is clickable — opens a small
// inline stepper popover; +/- saves on a 350 ms debounce so rapid taps
// coalesce, and a number input commits on blur. Each save also triggers
// the recipe→shopping-list resync via the server action.
export function MealSlotEntry({ entry }: { entry: PlanEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(entry.servings);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset draft if the server data changes (e.g., from another tab).
  useEffect(() => setDraft(entry.servings), [entry.servings]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function commit(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    if (value === entry.servings) return;
    startTransition(async () => {
      const r = await updateMealPlanEntryServings(entry.id, value);
      if (r.ok) {
        router.refresh();
      } else {
        console.error("[meal entry] update failed:", r.error);
        setDraft(entry.servings); // rollback the optimistic local value
      }
    });
  }

  function scheduleCommit(value: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(value), 350);
  }

  function bump(delta: number) {
    const next = Math.max(1, draft + delta);
    setDraft(next);
    scheduleCommit(next);
  }

  function commitInputNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(draft);
  }

  return (
    <div
      ref={wrapRef}
      className="meal-slot"
      data-cat={SLOT_CAT[entry.mealSlot]}
      style={{ cursor: "default", position: "relative" }}
    >
      <div className="slot-type">{entry.mealSlot}</div>
      <div className="slot-title">
        <span className="slot-emoji">{entry.recipe.hero_emoji}</span>{" "}
        {entry.recipe.title}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Edit servings"
        className="slot-servings"
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          textDecoration: open ? "underline" : "underline dotted",
          textDecorationColor: "var(--ink-soft)",
          textUnderlineOffset: 2,
        }}
      >
        {draft} serving{draft === 1 ? "" : "s"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--bg-card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow)",
            padding: 10,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 200,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="qty-stepper">
            <button
              type="button"
              onClick={() => bump(-1)}
              aria-label="Decrease servings"
            >
              <Minus size={12} />
            </button>
            <input
              type="number"
              min={1}
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
              onBlur={commitInputNow}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitInputNow();
                  setOpen(false);
                }
                if (e.key === "Escape") {
                  setDraft(entry.servings);
                  setOpen(false);
                }
              }}
              style={{
                width: 50,
                textAlign: "center",
                border: "none",
                background: "transparent",
                fontFamily: "var(--font-serif), serif",
                fontSize: 14,
                fontWeight: 500,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => bump(1)}
              aria-label="Increase servings"
            >
              <Plus size={12} />
            </button>
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-soft)", flex: 1 }}>
            {pending ? "Saving…" : "Saves automatically"}
          </span>
        </div>
      )}

      <RemoveEntryButton entryId={entry.id} />
    </div>
  );
}
