import { AlertCircle, MessageSquare, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { getActiveListGrouped } from "@/lib/db/shopping-list";
import type { Locale } from "@/lib/db/recipe-types";
import { formatQuantity } from "@/lib/units";
import { errorMessage } from "@/lib/errors";

export default async function ListPage() {
  const t = await getTranslations();
  const locale = ((await getLocale()) as Locale) ?? "en";

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header t={t} />
        <ConfigureBanner message={t("common.configureSupabase")} />
      </>
    );
  }

  let data: Awaited<ReturnType<typeof getActiveListGrouped>> | null = null;
  let loadError: string | null = null;
  try {
    data = await getActiveListGrouped(locale);
  } catch (err) {
    console.error("[list] getActiveListGrouped failed:", err);
    loadError = errorMessage(err);
  }

  const allGroups = data ? [...data.groups, ...(data.otherGroup ? [data.otherGroup] : [])] : [];
  const totalLines = allGroups.reduce((sum, g) => sum + g.lines.length, 0);

  return (
    <>
      <Header t={t} />

      {loadError && <ErrorBox message={loadError} />}

      <div className="quick-add">
        <div className="quick-add-row">
          <input placeholder="Add an item…" />
          <div className="qa-mode-toggle">
            <button type="button" className="active">
              {t("common.single")}
            </button>
            <button type="button">{t("common.bulkPaste")}</button>
          </div>
          <button type="button" className="btn btn-primary">
            <Plus /> {t("common.add")}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic", marginTop: 8 }}>
          Quick-add is wired up in the next commit. For now, open a recipe and
          tap "Add to shopping list" to populate this page.
        </div>
      </div>

      {totalLines === 0 && !loadError ? (
        <EmptyState />
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
                  locale === "nl" ? ing.name_nl : locale === "fr" ? ing.name_fr : ing.name_en;
                const formatted = formatQuantity(line.totalQty, line.unit, { locale });
                const sourceLabel =
                  line.sources.length === 0
                    ? ""
                    : line.sources.length === 1
                      ? line.sources[0].kind === "adhoc"
                        ? "ad-hoc"
                        : line.sources[0].recipeTitle
                      : `${line.sources.length} sources`;
                const isMergedFromMultiple = line.sources.length > 1;

                return (
                  <div
                    key={line.key}
                    className={`list-item${line.isUrgent ? " urgent" : ""}${line.isChecked ? " done" : ""}`}
                  >
                    <div className="check" />
                    <div className="item-icon">{ing.emoji}</div>
                    <div className="item-main">
                      <div className="item-row">
                        <span className="item-name">{name}</span>
                        {line.isUrgent && (
                          <span className="urgent-flag">
                            <AlertCircle /> {t("common.urgent")}
                          </span>
                        )}
                        {sourceLabel && (
                          <span
                            className={`item-source${isMergedFromMultiple ? " merged" : ""}`}
                          >
                            {sourceLabel}
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
                        {formatted.qty} <span className="unit">{formatted.unit}</span>
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
          {t("pages.list.title")} <em>{t("pages.list.titleEm")}</em>
        </h2>
        <p>{t("pages.list.subtitle")}</p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
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
      Couldn't load list: {message}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 48,
        textAlign: "center",
        boxShadow: "var(--shadow)",
        color: "var(--ink-soft)",
      }}
    >
      <h3 className="serif" style={{ fontWeight: 400, fontSize: 22, margin: 0, color: "var(--ink)" }}>
        Your list is empty
      </h3>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        Open a recipe and tap <strong>Add to shopping list</strong> to start.
      </p>
    </div>
  );
}
