"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<"en" | "nl" | "fr">("en");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/recipes`,
          // Stash signup details so the post-auth flow can create the profile row.
          data: { display_name: displayName, preferred_language: language },
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sign-up failed");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ color: "var(--olive)", fontSize: 14 }}>
        ✓ Magic link sent. Open the email from <strong>{email}</strong> to finish.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="name">Your name</label>
      <input
        id="name"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Maria"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <label htmlFor="lang">Preferred language</label>
      <select
        id="lang"
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          background: "var(--bg-paper)",
          borderRadius: 10,
          padding: "12px 14px",
          fontFamily: "inherit",
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
        <option value="fr">Français</option>
      </select>
      {error && (
        <div style={{ color: "var(--terracotta)", fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}
      <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
        <Mail /> {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
