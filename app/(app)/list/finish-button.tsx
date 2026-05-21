"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishShopping } from "./actions";

export function FinishShoppingButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("Finish shopping and move this list to History?")) return;
    setError(null);
    startTransition(async () => {
      const r = await finishShopping();
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="btn btn-primary"
      >
        <CheckCircle2 size={16} /> {pending ? "Finishing…" : "Finish shopping"}
      </button>
      {error && (
        <span style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</span>
      )}
    </div>
  );
}
