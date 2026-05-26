"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
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
      // The reset link in the email points to /auth/callback?next=/auth/reset-password.
      // The callback exchanges the recovery code for a session, then bounces
      // the user to /auth/reset-password, which lets them pick a new password.
      const redirectTo = new URL(
        "/auth/callback",
        window.location.origin,
      );
      redirectTo.searchParams.set("next", "/auth/reset-password");

      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      });
      if (err) throw err;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send reset email");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ color: "var(--olive)", fontSize: 14 }}>
        ✓ If <strong>{email}</strong> has an account, we just sent a reset
        link. Check your inbox.
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
        autoComplete="email"
      />
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
        <Mail /> {status === "sending" ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
