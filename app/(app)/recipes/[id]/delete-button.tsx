"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteRecipe } from "../actions";

export function DeleteRecipeButton({
  recipeId,
  recipeTitle,
}: {
  recipeId: string;
  recipeTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    const ok = window.confirm(
      `Delete "${recipeTitle}"? This can't be undone.`,
    );
    if (!ok) return;
    startTransition(() => deleteRecipe(recipeId));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn btn-secondary"
      style={{
        color: "var(--terracotta)",
        borderColor: pending ? "var(--line)" : undefined,
      }}
    >
      <Trash2 size={14} /> {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
