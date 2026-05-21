"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMealPlanEntry } from "./actions";

export function RemoveEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await removeMealPlanEntry(entryId);
      if (!r.ok) {
        console.error("[remove meal] failed:", r.error);
        setError(r.error);
      } else {
        // Force a fresh fetch so an open /list tab in the same window
        // also updates without a manual reload.
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
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
      {error && (
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 0,
            background: "var(--terracotta-soft)",
            border: "1px solid var(--terracotta)",
            color: "var(--ink)",
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            maxWidth: 220,
            zIndex: 5,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}
