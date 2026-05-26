"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setStatus("saving");
    try {
      const supabase = createClient();
      // The recovery code already established a session via /auth/callback.
      // updateUser writes the new password against that session.
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.push("/recipes");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't update password");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="password">New password</label>
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
      <label htmlFor="confirm">Confirm password</label>
      <input
        id="confirm"
        type="password"
        required
        minLength={6}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Type it again"
        autoComplete="new-password"
      />
      {error && (
        <div style={{ color: "var(--terracotta)", fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "saving"}
      >
        <KeyRound size={16} />
        {status === "saving" ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
