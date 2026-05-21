"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onClick() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
    startTransition(() => router.push("/login"));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-secondary"
      disabled={isPending}
    >
      <LogOut /> {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
