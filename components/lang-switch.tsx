"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const LOCALES = ["en", "nl", "fr"] as const;
const COOKIE = "sake_locale";

export function LangSwitch() {
  const current = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function setLocale(loc: string) {
    document.cookie = `${COOKIE}=${loc}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
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
