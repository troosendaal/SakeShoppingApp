"use client";

import { KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) throw err;
        setStatus("sent");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.push("/recipes");
        router.refresh();
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  if (status === "sent" && mode === "magic") {
    return (
      <div style={{ color: "var(--olive)", fontSize: 14 }}>
        ✓ Check your inbox — we sent a magic link to <strong>{email}</strong>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <ModeToggle mode={mode} onChange={setMode} />
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
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </>
      )}
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
          ? "Signing in…"
          : mode === "magic"
            ? "Send magic link"
            : "Sign in"}
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
