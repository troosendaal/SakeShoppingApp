"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
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
        options: { emailRedirectTo: `${window.location.origin}/recipes` },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ color: "var(--olive)", fontSize: 14 }}>
        ✓ Check your inbox — we sent a magic link to <strong>{email}</strong>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && (
        <div style={{ color: "var(--terracotta)", fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}
      <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
        <Mail /> {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
