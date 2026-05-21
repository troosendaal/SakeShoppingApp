"use client";

import {
  AlertCircle,
  Check,
  MessageSquare,
  Minus,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { UNITS } from "@/lib/db/recipe-types";
import {
  clearLineQuantityOverride,
  setLineChecked,
  setLineNote,
  setLineQuantity,
  setLineUrgent,
} from "./actions";

type LineSource =
  | { kind: "recipe"; recipeTitle: string }
  | { kind: "adhoc" };

export function ListLine({
  ingredientId,
  emoji,
  name,
  sources,
  qtyDisplay,
  qtyValue,
  unitDisplay,
  isChecked,
  isUrgent,
  note,
  hasQtyOverride,
  urgentLabel,
}: {
  ingredientId: string;
  emoji: string;
  name: string;
  sources: LineSource[];
  qtyDisplay: string;
  qtyValue: number;
  unitDisplay: string;
  isChecked: boolean;
  isUrgent: boolean;
  note: string | null;
  hasQtyOverride: boolean;
  urgentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [qtyOpen, setQtyOpen] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(qtyValue);
  const [unitDraft, setUnitDraft] = useState(unitDisplay);
  const qtyRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Click-outside to close the qty popover (without saving)
  useEffect(() => {
    if (!qtyOpen) return;
    function onClick(e: MouseEvent) {
      if (qtyRef.current && !qtyRef.current.contains(e.target as Node)) {
        setQtyOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [qtyOpen]);

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
    // React 19's startTransition callback must return void — discard the
    // server-action promise explicitly.
    startTransition(() => {
      void setLineNote(ingredientId, null);
    });
  }
  function saveNote() {
    const cleaned = noteDraft.trim() || null;
    setLocalNote(cleaned);
    setEditingNote(false);
    startTransition(() => {
      void setLineNote(ingredientId, cleaned);
    });
  }
  function cancelNote() {
    setEditingNote(false);
    setNoteDraft(localNote ?? "");
  }

  function openQty() {
    setQtyDraft(qtyValue);
    setUnitDraft(unitDisplay);
    setQtyOpen(true);
  }
  // Schedule a save with a tiny debounce so rapid +/- taps coalesce into
  // one server call instead of spamming the API.
  function scheduleSave(qty: number, unit: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!Number.isFinite(qty) || qty <= 0) return;
      startTransition(() => {
        void setLineQuantity(ingredientId, qty, unit);
      });
    }, 350);
  }
  function bumpQty(delta: number) {
    const next = Math.max(0.1, +(qtyDraft + delta).toFixed(2));
    setQtyDraft(next);
    scheduleSave(next, unitDraft);
  }
  function commitInputQty() {
    if (!Number.isFinite(qtyDraft) || qtyDraft <= 0) return;
    // User finished typing — save immediately, don't wait on the debounce.
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    startTransition(() => {
      void setLineQuantity(ingredientId, qtyDraft, unitDraft);
    });
  }
  function changeUnit(unit: string) {
    setUnitDraft(unit);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    startTransition(() => {
      void setLineQuantity(ingredientId, qtyDraft, unit);
    });
  }
  function resetQty() {
    setQtyOpen(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    startTransition(() => {
      void clearLineQuantityOverride(ingredientId);
    });
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
      <div ref={qtyRef} className="qty-cell" style={{ position: "relative" }}>
        <button
          type="button"
          onClick={openQty}
          className="qty-display serif"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
          }}
          aria-label="Edit quantity"
        >
          {qtyDisplay} <span className="unit">{unitDisplay}</span>
          {hasQtyOverride && (
            <span
              title="Manually edited — click to adjust or reset"
              style={{
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--terracotta)",
                background: "var(--terracotta-soft)",
                padding: "1px 5px",
                borderRadius: 4,
                marginLeft: 4,
                fontStyle: "normal",
                fontFamily: "var(--font-sans), sans-serif",
              }}
            >
              edited
            </span>
          )}
        </button>
        {qtyOpen && (
          <div
            style={{
              position: "absolute",
              top: 28,
              right: 0,
              background: "var(--bg-card)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
              padding: 12,
              minWidth: 240,
              zIndex: 15,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-soft)",
              }}
            >
              Quantity
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="qty-stepper">
                <button
                  type="button"
                  onClick={() => bumpQty(-1)}
                  aria-label="Decrease"
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={qtyDraft}
                  onChange={(e) => setQtyDraft(Number(e.target.value))}
                  onBlur={commitInputQty}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitInputQty();
                      setQtyOpen(false);
                    }
                    if (e.key === "Escape") setQtyOpen(false);
                  }}
                  style={{
                    width: 60,
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
                  onClick={() => bumpQty(1)}
                  aria-label="Increase"
                >
                  <Plus size={12} />
                </button>
              </div>
              <select
                value={unitDraft}
                onChange={(e) => changeUnit(e.target.value)}
                style={{
                  flex: 1,
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  background: "var(--bg-paper)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
              }}
            >
              {hasQtyOverride ? (
                <button
                  type="button"
                  onClick={resetQty}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ink-soft)",
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: 0,
                  }}
                >
                  <RotateCcw size={12} /> Reset to auto
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                  }}
                >
                  Changes save automatically.
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  commitInputQty();
                  setQtyOpen(false);
                }}
                style={{
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--ink-soft)",
                  padding: "5px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
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

// "Recently bought" companion — compact row for the dark section at the
// bottom of the list. Click the checkbox to restore the item back to the
// active list.
export function RecentItem({
  ingredientId,
  emoji,
  name,
  qtyDisplay,
  unitDisplay,
}: {
  ingredientId: string;
  emoji: string;
  name: string;
  qtyDisplay: string;
  unitDisplay: string;
}) {
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      await setLineChecked(ingredientId, false);
    });
  }

  return (
    <div className="recent-item" style={{ opacity: pending ? 0.55 : 1 }}>
      <button
        type="button"
        className="check"
        onClick={restore}
        disabled={pending}
        aria-label="Restore to list"
      >
        <Check />
      </button>
      <div className="emoji">{emoji}</div>
      <div className="name">{name}</div>
      <div className="qty">
        {qtyDisplay} {unitDisplay}
      </div>
    </div>
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
