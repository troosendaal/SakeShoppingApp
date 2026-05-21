"use client";

import {
  AlertCircle,
  Check,
  MessageSquare,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { setLineChecked, setLineNote, setLineUrgent } from "./actions";

type LineSource =
  | { kind: "recipe"; recipeTitle: string }
  | { kind: "adhoc" };

export function ListLine({
  ingredientId,
  emoji,
  name,
  sources,
  qtyDisplay,
  unitDisplay,
  isChecked,
  isUrgent,
  note,
  urgentLabel,
}: {
  ingredientId: string;
  emoji: string;
  name: string;
  sources: LineSource[];
  qtyDisplay: string;
  unitDisplay: string;
  isChecked: boolean;
  isUrgent: boolean;
  note: string | null;
  urgentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Optimistic local mirrors so the UI feels snappy.
  const [localChecked, setLocalChecked] = useState(isChecked);
  const [localUrgent, setLocalUrgent] = useState(isUrgent);
  const [localNote, setLocalNote] = useState(note);

  useEffect(() => setLocalChecked(isChecked), [isChecked]);
  useEffect(() => setLocalUrgent(isUrgent), [isUrgent]);
  useEffect(() => {
    setLocalNote(note);
    setNoteDraft(note ?? "");
  }, [note]);

  // Click-outside to close menu
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function toggleCheck() {
    const next = !localChecked;
    setLocalChecked(next);
    startTransition(async () => {
      const r = await setLineChecked(ingredientId, next);
      if (!r.ok) setLocalChecked(!next);
    });
  }
  function toggleUrgent() {
    setMenuOpen(false);
    const next = !localUrgent;
    setLocalUrgent(next);
    startTransition(async () => {
      const r = await setLineUrgent(ingredientId, next);
      if (!r.ok) setLocalUrgent(!next);
    });
  }
  function startNoteEdit() {
    setMenuOpen(false);
    setEditingNote(true);
  }
  function clearNote() {
    setMenuOpen(false);
    setLocalNote(null);
    setNoteDraft("");
    startTransition(() => setLineNote(ingredientId, null));
  }
  function saveNote() {
    const cleaned = noteDraft.trim() || null;
    setLocalNote(cleaned);
    setEditingNote(false);
    startTransition(() => setLineNote(ingredientId, cleaned));
  }
  function cancelNote() {
    setEditingNote(false);
    setNoteDraft(localNote ?? "");
  }

  const sourceLabel = labelFor(sources);
  const isMerged = sources.length > 1;

  return (
    <div
      className={`list-item${localUrgent ? " urgent" : ""}${localChecked ? " done" : ""}`}
    >
      <button
        type="button"
        className="check"
        onClick={toggleCheck}
        aria-label={localChecked ? "Mark not bought" : "Mark bought"}
        disabled={pending}
        style={{ cursor: "pointer" }}
      >
        <Check />
      </button>
      <div className="item-icon">{emoji}</div>
      <div className="item-main">
        <div className="item-row">
          <span className="item-name">{name}</span>
          {localUrgent && (
            <span className="urgent-flag">
              <AlertCircle /> {urgentLabel}
            </span>
          )}
          {sourceLabel && (
            <span className={`item-source${isMerged ? " merged" : ""}`}>
              {sourceLabel}
            </span>
          )}
        </div>
        {editingNote ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote();
                if (e.key === "Escape") cancelNote();
              }}
              placeholder="Add a note…"
              maxLength={200}
              style={{
                flex: 1,
                fontSize: 12,
                fontStyle: "italic",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "4px 8px",
                background: "var(--bg-paper)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={saveNote}
              style={{
                fontSize: 11,
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none",
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelNote}
              aria-label="Cancel"
              style={{
                fontSize: 11,
                background: "transparent",
                color: "var(--ink-soft)",
                border: "1px solid var(--line)",
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <X size={11} />
            </button>
          </div>
        ) : localNote ? (
          <button
            type="button"
            className="note"
            onClick={startNoteEdit}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <MessageSquare /> {localNote}
          </button>
        ) : (
          <button type="button" className="note-add" onClick={startNoteEdit}>
            <Plus /> add note
          </button>
        )}
      </div>
      <div className="qty-cell">
        <span className="qty-display serif">
          {qtyDisplay} <span className="unit">{unitDisplay}</span>
        </span>
      </div>
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Line options"
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--ink-soft)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: 30,
              right: 0,
              background: "var(--bg-card)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "var(--shadow)",
              padding: 4,
              minWidth: 180,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MenuItem
              icon={<AlertCircle size={14} />}
              label={localUrgent ? "Remove urgent" : "Mark urgent"}
              onClick={toggleUrgent}
            />
            <MenuItem
              icon={<MessageSquare size={14} />}
              label={localNote ? "Edit note" : "Add note"}
              onClick={startNoteEdit}
            />
            {localNote && (
              <MenuItem
                icon={<Trash2 size={14} />}
                label="Clear note"
                onClick={clearNote}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 13,
        color: "var(--ink)",
        borderRadius: 6,
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-paper)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function labelFor(sources: LineSource[]): string {
  if (sources.length === 0) return "";
  if (sources.length === 1) {
    const s = sources[0];
    return s.kind === "adhoc" ? "ad-hoc" : s.recipeTitle;
  }
  const recipeNames = sources
    .filter((s): s is LineSource & { kind: "recipe" } => s.kind === "recipe")
    .map((s) => s.recipeTitle);
  if (recipeNames.length === sources.length) {
    return `${recipeNames.length} recipes`;
  }
  return `${sources.length} sources`;
}
