"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, Eye, EyeOff, GripVertical } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@/lib/db/recipe-types";
import type { CategoryRow } from "@/lib/db/settings";
import { saveCategoryOrder, setCategoryHidden } from "./actions";

export function CategorySort({
  initialCategories,
  locale,
}: {
  initialCategories: CategoryRow[];
  locale: Locale;
}) {
  const [items, setItems] = useState(initialCategories);
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-sync local state if the server pushes new defaults (rare).
  useEffect(() => setItems(initialCategories), [initialCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function nameOf(c: CategoryRow): string {
    return locale === "nl" ? c.name_nl : locale === "fr" ? c.name_fr : c.name_en;
  }

  function persistOrder(next: CategoryRow[]) {
    startTransition(async () => {
      const r = await saveCategoryOrder(next.map((c) => c.id));
      if (r.ok) setSavedAt(Date.now());
      else console.error("[settings] saveCategoryOrder:", r.error);
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    persistOrder(next);
  }

  function toggleHidden(id: string) {
    const next = items.map((c) =>
      c.id === id ? { ...c, is_hidden: !c.is_hidden } : c,
    );
    setItems(next);
    const target = next.find((c) => c.id === id);
    if (!target) return;
    startTransition(async () => {
      const r = await setCategoryHidden(id, target.is_hidden);
      if (r.ok) setSavedAt(Date.now());
      else console.error("[settings] setCategoryHidden:", r.error);
    });
  }

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h3 className="serif" style={cardTitleStyle}>
          <ArrowUpDown size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Category order
        </h3>
        {savedAt && (
          <span style={{ fontSize: 11, color: "var(--olive)", fontStyle: "italic" }}>
            ✓ Saved
          </span>
        )}
      </div>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--ink-soft)" }}>
        Drag to reorder how categories show up on your shopping list. Toggle the
        eye to hide ones you never use — hidden items collapse into "Other" at
        the bottom of the list.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((c) => (
              <SortableRow
                key={c.id}
                id={c.id}
                emoji={c.emoji}
                name={nameOf(c)}
                hidden={c.is_hidden}
                onToggle={() => toggleHidden(c.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableRow({
  id,
  emoji,
  name,
  hidden,
  onToggle,
}: {
  id: string;
  emoji: string;
  name: string;
  hidden: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: isDragging ? "var(--bg-paper)" : "var(--bg-card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    marginBottom: 6,
    opacity: hidden ? 0.55 : 1,
    boxShadow: isDragging ? "var(--shadow)" : "none",
  };

  return (
    <li ref={setNodeRef} style={style}>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        style={{
          border: "none",
          background: "transparent",
          cursor: "grab",
          color: "var(--ink-soft)",
          padding: 2,
          display: "grid",
          placeItems: "center",
          touchAction: "none",
        }}
      >
        <GripVertical size={14} />
      </button>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 14 }}>{name}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-label={hidden ? "Show category" : "Hide category"}
        title={hidden ? "Show on list" : "Hide from list"}
        style={{
          border: "1px solid var(--line)",
          background: "var(--bg-paper)",
          borderRadius: 8,
          padding: "5px 8px",
          cursor: "pointer",
          color: hidden ? "var(--ink-soft)" : "var(--olive)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </li>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 24,
  boxShadow: "var(--shadow)",
  marginBottom: 20,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 500,
  fontSize: 18,
};
