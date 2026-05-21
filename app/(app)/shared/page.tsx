import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";

export default function SharedPage() {
  const t = useTranslations();
  const showBanner = !isSupabaseConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.shared.title")} <em>{t("pages.shared.titleEm")}</em>
          </h2>
          <p>{t("pages.shared.subtitle")}</p>
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 48,
          textAlign: "center",
          boxShadow: "var(--shadow)",
        }}
      >
        <Users size={32} color="var(--ink-soft)" />
        <h3 className="serif" style={{ marginTop: 12, fontWeight: 400, fontSize: 22 }}>
          No shared lists yet
        </h3>
        <p style={{ color: "var(--ink-soft)", marginTop: 4, fontSize: 14 }}>
          When someone shares a list with you, it will appear here.
        </p>
      </div>
    </>
  );
}
