"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const LOCALES = ["en", "nl", "fr"] as const;
const COOKIE = "sake_locale";

export function LangSwitch() {
  const current = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function setLocale(loc: (typeof LOCALES)[number]) {
    // Always set the cookie — that's how next-intl reads the active locale.
    document.cookie = `${COOKIE}=${loc}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // If we have a session, mirror to profiles.preferred_language so the
    // choice persists across browsers / devices.
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ preferred_language: loc })
          .eq("id", user.id);
      }
    } catch {
      // Supabase not configured or logged out — cookie is enough.
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={current === l ? "active" : ""}
          onClick={() => setLocale(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
