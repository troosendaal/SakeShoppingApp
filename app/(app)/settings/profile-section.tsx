"use client";

import { Check, User } from "lucide-react";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/db/recipe-types";
import { updateProfile } from "./actions";

type UnitSystem = "metric" | "imperial";

export function ProfileSection({
  initialDisplayName,
  initialLanguage,
  initialUnitSystem,
  email,
}: {
  initialDisplayName: string;
  initialLanguage: Locale;
  initialUnitSystem: UnitSystem;
  email: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialUnitSystem);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("idle");
    setError(null);
    startTransition(async () => {
      const r = await updateProfile({
        displayName,
        preferredLanguage: language,
        preferredUnitSystem: unitSystem,
      });
      if (r.ok) {
        setFeedback("saved");
        setTimeout(() => setFeedback("idle"), 2200);
      } else {
        setFeedback("error");
        setError(r.error);
      }
    });
  }

  return (
    <section style={cardStyle}>
      <h3 className="serif" style={cardTitleStyle}>
        <User size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
        Profile
      </h3>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={inputStyle}
            maxLength={80}
          />
        </Field>
        <Field label="Email">
          <input value={email ?? "—"} disabled style={{ ...inputStyle, opacity: 0.6 }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Preferred language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Locale)}
              style={inputStyle}
            >
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
              <option value="fr">Français</option>
            </select>
          </Field>
          <Field label="Unit system">
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
              style={inputStyle}
            >
              <option value="metric">Metric (g, kg, ml, l)</option>
              <option value="imperial">Imperial (oz, lb, fl_oz)</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          {feedback === "saved" && (
            <span style={{ color: "var(--olive)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Check size={12} /> Saved
            </span>
          )}
          {feedback === "error" && error && (
            <span style={{ color: "var(--terracotta)", fontSize: 12 }}>{error}</span>
          )}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
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
  margin: "0 0 16px",
  fontWeight: 500,
  fontSize: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  background: "var(--bg-paper)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
};
