import Link from "next/link";
import { Flame, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { LangSwitch } from "./lang-switch";

export function Topbar({
  initials = "?",
  displayName,
}: {
  initials?: string;
  displayName?: string;
}) {
  const t = useTranslations("brand");
  return (
    <header className="topbar">
      <Link href="/recipes" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="brand-mark">
          <Flame strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="serif">
            saké<em>.</em>
          </h1>
          <small>{t("tagline")}</small>
        </div>
      </Link>
      <div className="topbar-actions">
        <LangSwitch />
        <Link href="/settings" className="icon-btn" aria-label="Settings">
          <Settings />
        </Link>
        <div className="avatar" title={displayName ?? "Not signed in"}>
          {initials}
        </div>
      </div>
    </header>
  );
}
