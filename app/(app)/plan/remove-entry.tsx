"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { removeMealPlanEntry } from "./actions";

export function RemoveEntryButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => void removeMealPlanEntry(entryId))}
      disabled={pending}
      aria-label="Remove meal"
      style={{
        position: "absolute",
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "rgba(255,255,255,.85)",
        border: "none",
        cursor: "pointer",
        color: "var(--ink-soft)",
        display: "grid",
        placeItems: "center",
        opacity: pending ? 0.4 : 1,
      }}
    >
      <X size={11} />
    </button>
  );
}
