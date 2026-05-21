"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { duplicateShoppingList } from "@/app/(app)/list/actions";

export function DuplicateListButton({
  listId,
  title,
}: {
  listId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      `Duplicate "${title}" as a new active list? Your current active list will be archived.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await duplicateShoppingList(listId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push("/list");
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
        className="btn btn-secondary"
      >
        <Copy size={14} /> {pending ? "Duplicating…" : "Duplicate"}
      </button>
      {error && (
        <span
          style={{
            color: "var(--terracotta)",
            fontSize: 11,
            marginLeft: 8,
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}
