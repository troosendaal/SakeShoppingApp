"use client";

import { ShoppingBasket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buildShoppingListFromWeek } from "./actions";

export function BuildListButton({
  weekStart,
  entryCount,
}: {
  weekStart: string;
  entryCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const r = await buildShoppingListFromWeek(weekStart);
      if (r.ok) {
        setFeedback(`Added ${r.addedCount} recipe${r.addedCount === 1 ? "" : "s"} to your list`);
        setTimeout(() => router.push("/list"), 600);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || entryCount === 0}
        className="btn btn-primary"
        title={entryCount === 0 ? "Add at least one meal first" : undefined}
      >
        <ShoppingBasket size={16} />
        {pending ? "Building…" : "Build shopping list"}
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
