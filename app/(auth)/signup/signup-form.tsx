"use client";

import { KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

function buildCallbackUrl(next: string): string {
  const url = new URL("/auth/callback", window.location.origin);
  if (next && next !== "/recipes") {
    url.searchParams.set("next", next);
  }
  return url.toString();
}

export function SignupForm({ next = "/recipes" }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<"en" | "nl" | "fr">("en");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const supabase = createClient();
      const userMetadata = {
        display_name: displayName,
        preferred_language: language,
      };

      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: buildCallbackUrl(next),
            data: userMetadata,
          },
        });
        if (err) throw err;
        setStatus("sent");
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildCallbackUrl(next),
            data: userMetadata,
          },
        });
        if (err) throw err;
        // If email confirmation is required, signUp returns user but no
        // session — they need to click the confirm link. If it's disabled
        // (Supabase Auth settings), we get a session right away.
        if (data.session) {
          // Set locale cookie to match what was just stored in profiles, so
          // the UI doesn't load with a stale previous-user locale.
          document.cookie = `sake_locale=${language}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          router.push(next);
          router.refresh();
        } else {
          setStatus("sent");
        }
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sign-up failed");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ color: "var(--olive)", fontSize: 14 }}>
        ✓ Check your inbox — confirm via the link we sent to{" "}
        <strong>{email}</strong>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <ModeToggle mode={mode} onChange={setMode} />
      <label htmlFor="name">Your name</label>
      <input
        id="name"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Maria"
        autoComplete="name"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      {mode === "password" && (
        <>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </>
      )}
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
        <div style={{ color: "var(--terracotta)", fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "sending"}
      >
        {mode === "magic" ? <Mail /> : <KeyRound size={16} />}
        {status === "sending"
          ? "Creating account…"
          : mode === "magic"
            ? "Send magic link"
            : "Create account"}
      </button>
    </form>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg-paper)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 3,
        marginBottom: 16,
      }}
    >
      {(["password", "magic"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            flex: 1,
            border: "none",
            background: mode === m ? "var(--ink)" : "transparent",
            color: mode === m ? "var(--bg)" : "var(--ink-soft)",
            padding: "6px 10px",
            borderRadius: 7,
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {m === "password" ? "Password" : "Magic link"}
        </button>
      ))}
    </div>
  );
}
