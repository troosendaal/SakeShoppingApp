import { getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { getCompletedLists, type CompletedListSummary } from "@/lib/db/shopping-list";
import { errorMessage } from "@/lib/errors";
import { DuplicateListButton } from "./duplicate-button";

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateBlock(iso: string | null): { month: string; day: string } {
  if (!iso) return { month: "—", day: "—" };
  const d = new Date(iso);
  return { month: MONTHS_EN[d.getMonth()] ?? "—", day: String(d.getDate()) };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "completed at unknown time";
  const d = new Date(iso);
  const formatted = d.toLocaleString(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  return `completed ${formatted}`;
}

export default async function HistoryPage() {
  const t = await getTranslations();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header t={t} />
        <ConfigureBanner message={t("common.configureSupabase")} />
      </>
    );
  }

  let lists: CompletedListSummary[] = [];
  let loadError: string | null = null;
  try {
    lists = await getCompletedLists();
  } catch (err) {
    console.error("[history] getCompletedLists failed:", err);
    loadError = errorMessage(err);
  }

  return (
    <>
      <Header t={t} />

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
          Couldn't load history: {loadError}
        </div>
      )}

      {lists.length === 0 && !loadError ? (
        <EmptyState />
      ) : (
        <div className="history-list">
          {lists.map((list) => {
            const { month, day } = dateBlock(list.completedAt ?? list.createdAt);
            const summary = `${list.recipeCount} recipe${list.recipeCount === 1 ? "" : "s"} · ${list.adhocCount} ad-hoc · ${relativeTime(list.completedAt)}`;
            const items = list.boughtCount;

            return (
              <div key={list.id} className="history-card">
                <div className="date-block">
                  <div className="month">{month}</div>
                  <div className="day serif">{day}</div>
                </div>
                <div className="info">
                  <h5 className="serif">{list.title || "Shopping list"}</h5>
                  <p>{summary}</p>
                </div>
                <div className="stats">
                  <div>
                    <b className="serif">{items}</b> bought
                  </div>
                </div>
                <div className="actions">
                  <DuplicateListButton listId={list.id} title={list.title} />
                </div>
              </div>
            );
          })}
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
          {t("pages.history.title")} <em>{t("pages.history.titleEm")}</em>
        </h2>
        <p>{t("pages.history.subtitle")}</p>
      </div>
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
      <h3
        className="serif"
        style={{ fontWeight: 400, fontSize: 22, margin: 0, color: "var(--ink)" }}
      >
        No past lists yet
      </h3>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        Finish your first shopping list and it will appear here. You can
        duplicate any past list to start a fresh one.
      </p>
    </div>
  );
}
