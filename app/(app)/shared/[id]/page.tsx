import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronLeft, MessageSquare, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { errorMessage } from "@/lib/errors";
import { formatQuantity } from "@/lib/units";
import type { Locale } from "@/lib/db/recipe-types";
import { getListGroupedById, getListSummary } from "@/lib/db/shopping-list";
import { getListMembers } from "@/lib/db/sharing";

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = ((await getLocale()) as Locale) ?? "en";
  const t = await getTranslations();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header t={t} />
        <ConfigureBanner message={t("common.configureSupabase")} />
      </>
    );
  }

  let data: Awaited<ReturnType<typeof getListGroupedById>> | null = null;
  let summary: Awaited<ReturnType<typeof getListSummary>> = null;
  let members: Awaited<ReturnType<typeof getListMembers>> = [];
  let loadError: string | null = null;
  try {
    [data, summary, members] = await Promise.all([
      getListGroupedById(locale, id),
      getListSummary(id),
      getListMembers(id),
    ]);
  } catch (err) {
    console.error("[shared/[id]] load failed:", err);
    loadError = errorMessage(err);
  }

  if (!loadError && !summary) notFound();

  const allGroups = data
    ? [...data.groups, ...(data.otherGroup ? [data.otherGroup] : [])]
    : [];
  const totalLines = allGroups.reduce((s, g) => s + g.lines.length, 0);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/shared"
          style={{
            color: "var(--ink-soft)",
            fontSize: 13,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ChevronLeft size={14} /> Shared with you
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h2>
            {summary?.title ?? "Shared list"}{" "}
            <em style={{ color: "var(--terracotta)" }}>·</em>
          </h2>
          <p>Read-only view. Edits are coming next.</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--ink-soft)",
            fontSize: 13,
          }}
        >
          <Users size={14} />
          {members.length} member{members.length === 1 ? "" : "s"}
        </div>
      </div>

      {loadError && (
        <div
          style={{
            background: "var(--terracotta-soft)",
            border: "1px solid var(--terracotta)",
            color: "var(--ink)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Couldn't load list: {loadError}
        </div>
      )}

      {members.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              fontWeight: 600,
              marginRight: 4,
            }}
          >
            Members
          </span>
          {members.map((m) => (
            <span
              key={m.userId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                background: m.role === "owner" ? "var(--honey-soft)" : "var(--bg-paper)",
                border: "1px solid var(--line)",
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              {m.displayName}
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-soft)",
                }}
              >
                {m.role}
              </span>
            </span>
          ))}
        </div>
      )}

      {totalLines === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 48,
            textAlign: "center",
            boxShadow: "var(--shadow)",
            color: "var(--ink-soft)",
            fontSize: 14,
          }}
        >
          This list is empty.
        </div>
      ) : (
        <div className="list-main">
          {allGroups.map((group) => (
            <div key={group.categoryId} className="list-group">
              <div className="group-head">
                <h4 className="serif">
                  <span className="em">{group.categoryEmoji}</span> {group.categoryName}{" "}
                  <span className="count">{group.lines.length}</span>
                </h4>
              </div>
              {group.lines.map((line) => {
                const ing = line.ingredient;
                const name =
                  locale === "nl"
                    ? ing.name_nl
                    : locale === "fr"
                      ? ing.name_fr
                      : ing.name_en;
                const formatted = formatQuantity(line.totalQty, line.unit, { locale });
                return (
                  <div
                    key={line.key}
                    className={`list-item${line.isUrgent ? " urgent" : ""}${line.isChecked ? " done" : ""}`}
                  >
                    <div className="check" aria-hidden />
                    <div className="item-icon">{ing.emoji}</div>
                    <div className="item-main">
                      <div className="item-row">
                        <span className="item-name">{name}</span>
                        {line.isUrgent && (
                          <span className="urgent-flag">
                            <AlertCircle /> {t("common.urgent")}
                          </span>
                        )}
                      </div>
                      {line.note && (
                        <div className="note">
                          <MessageSquare /> {line.note}
                        </div>
                      )}
                    </div>
                    <div className="qty-cell">
                      <span className="qty-display serif">
                        {formatted.qty}{" "}
                        <span className="unit">{formatted.unit}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div className="page-head">
      <div>
        <h2>
          {t("pages.shared.title")} <em>{t("pages.shared.titleEm")}</em>
        </h2>
      </div>
    </div>
  );
}
