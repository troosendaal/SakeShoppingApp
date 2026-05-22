"use client";

import {
  Check,
  Copy,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  createInviteLink,
  removeMember,
} from "./share-actions";

export type ShareMember = {
  userId: string;
  displayName: string;
  role: "owner" | "editor";
};

export function ShareButton({
  listId,
  initialMembers,
}: {
  listId: string;
  initialMembers: ShareMember[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [members, setMembers] = useState(initialMembers);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the members list with the latest server data on every render —
  // doesn't touch the modal's transient state (invite URL, etc).
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Reset transient state ONLY when the modal opens, not when other props
  // change while it's open (otherwise the freshly-generated invite link
  // disappears the moment the action's revalidation re-renders the page).
  useEffect(() => {
    if (open) {
      setInviteUrl(null);
      setCopied(false);
      setError(null);
    }
  }, [open]);

  function generate() {
    setError(null);
    setInviteUrl(null);
    setCopied(false);
    startTransition(async () => {
      const r = await createInviteLink(listId);
      if (!r.ok) {
        setError(r.error);
      } else {
        const url = `${window.location.origin}/invite/${r.token}`;
        setInviteUrl(url);
      }
    });
  }

  function copyToClipboard() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setError("Couldn't copy — copy the link manually."),
    );
  }

  function onRemove(userId: string) {
    if (!window.confirm("Remove this person from the list?")) return;
    startTransition(async () => {
      const r = await removeMember(listId, userId);
      if (r.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary"
        title="Share this list"
      >
        <Share2 size={14} /> Share
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31,24,20,.55)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 24,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              background: "var(--bg-paper)",
              borderRadius: 18,
              boxShadow: "var(--shadow)",
              maxWidth: 480,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderBottom: "1px solid var(--line)",
                padding: "16px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                className="serif"
                style={{ fontWeight: 500, fontSize: 20, margin: 0 }}
              >
                Share <em style={{ color: "var(--terracotta)" }}>list.</em>
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                <X />
              </button>
            </div>

            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <SectionLabel>People with access</SectionLabel>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px dashed var(--line-soft)",
                        fontSize: 14,
                      }}
                    >
                      <div
                        className="avatar"
                        style={{ width: 28, height: 28, fontSize: 11 }}
                      >
                        {initialsOf(m.displayName)}
                      </div>
                      <span style={{ flex: 1 }}>{m.displayName}</span>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-soft)",
                          background: m.role === "owner" ? "var(--honey-soft)" : "var(--bg-paper)",
                          border: "1px solid var(--line)",
                          padding: "2px 6px",
                          borderRadius: 5,
                        }}
                      >
                        {m.role}
                      </span>
                      {m.role !== "owner" && (
                        <button
                          type="button"
                          onClick={() => onRemove(m.userId)}
                          aria-label="Remove member"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--ink-soft)",
                            padding: 2,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                  {members.length === 0 && (
                    <li
                      style={{
                        fontSize: 13,
                        color: "var(--ink-soft)",
                        fontStyle: "italic",
                        padding: "8px 0",
                      }}
                    >
                      Just you so far.
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <SectionLabel>Invite by link</SectionLabel>
                {inviteUrl ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                    <input
                      readOnly
                      value={inviteUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      style={{
                        flex: 1,
                        border: "1px solid var(--line)",
                        background: "var(--bg-paper)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontFamily: "monospace",
                        fontSize: 12,
                        outline: "none",
                        color: "var(--ink)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="btn btn-primary"
                      style={{ flex: "0 0 auto" }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generate}
                    disabled={pending}
                    className="btn btn-secondary"
                  >
                    {pending ? "Generating…" : "Generate invite link"}
                  </button>
                )}
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                  }}
                >
                  Anyone with this link can join the list as an editor.
                  Link expires in 7 days.
                </p>
              </div>

              {error && (
                <div style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</div>
              )}
            </div>

            <div
              style={{
                background: "var(--bg-paper)",
                borderTop: "1px solid var(--line)",
                padding: "12px 22px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-secondary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink-soft)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
}
