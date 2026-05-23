import { CheckCircle2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import {
  getActiveListGrouped,
  getOrCreateActiveList,
} from "@/lib/db/shopping-list";
import { getListMembers } from "@/lib/db/sharing";
import { listIngredients } from "@/lib/db/recipes";
import { listCategories } from "@/lib/db/categories";
import type { Locale } from "@/lib/db/recipe-types";
import { formatQuantity } from "@/lib/units";
import { errorMessage } from "@/lib/errors";
import { ListLine, RecentItem } from "./list-line";
import { QuickAdd } from "./quick-add";
import { FinishShoppingButton } from "./finish-button";
import { ResyncButton } from "./resync-button";
import { ShareButton } from "./share-button";

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
  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let activeListId: string | null = null;
  let members: Awaited<ReturnType<typeof getListMembers>> = [];
  let loadError: string | null = null;
  try {
    const active = await getOrCreateActiveList();
    activeListId = active.id;
    [data, ingredients, categories, members] = await Promise.all([
      getActiveListGrouped(locale),
      listIngredients(),
      listCategories(),
      getListMembers(active.id),
    ]);
  } catch (err) {
    console.error("[list] load failed:", err);
    loadError = errorMessage(err);
  }

  const allGroups = data ? [...data.groups, ...(data.otherGroup ? [data.otherGroup] : [])] : [];

  // Split active vs. checked. Active lines stay grouped by category. Checked
  // lines collapse into a single "Recently bought" section at the bottom,
  // sorted by most-recently-checked first (we approximate that with the
  // existing alpha order since checked_at isn't surfaced — good enough for v1).
  const activeGroups = allGroups
    .map((g) => ({ ...g, lines: g.lines.filter((l) => !l.isChecked) }))
    .filter((g) => g.lines.length > 0);

  const recentLines = allGroups.flatMap((g) => g.lines.filter((l) => l.isChecked));
  const totalLines = allGroups.reduce((sum, g) => sum + g.lines.length, 0);

  function nameOf(line: { ingredient: { name_en: string; name_nl: string; name_fr: string } }) {
    const ing = line.ingredient;
    return locale === "nl" ? ing.name_nl : locale === "fr" ? ing.name_fr : ing.name_en;
  }

  return (
    <>
      <Header t={t} />

      {loadError && <ErrorBox message={loadError} />}

      <QuickAdd
        ingredients={ingredients}
        categories={categories}
        locale={locale}
        singleLabel={t("common.single")}
        bulkLabel={t("common.bulkPaste")}
        addLabel={t("common.add")}
      />

      {totalLines === 0 && !loadError ? (
        <EmptyState />
      ) : (
        <>
          {activeGroups.length > 0 ? (
            <div className="list-main">
              {activeGroups.map((group) => (
                <div key={group.categoryId} className="list-group">
                  <div className="group-head">
                    <h4 className="serif">
                      <span className="em">{group.categoryEmoji}</span> {group.categoryName}{" "}
                      <span className="count">{group.lines.length}</span>
                    </h4>
                  </div>
                  {group.lines.map((line) => {
                    const formatted = formatQuantity(line.totalQty, line.unit, { locale });
                    return (
                      <ListLine
                        key={line.key}
                        ingredientId={line.ingredient.id}
                        emoji={line.ingredient.emoji}
                        name={nameOf(line)}
                        sources={line.sources.map((s) =>
                          s.kind === "recipe"
                            ? { kind: "recipe", recipeTitle: s.recipeTitle }
                            : { kind: "adhoc" },
                        )}
                        qtyDisplay={formatted.qty}
                        qtyValue={line.totalQty}
                        unitDisplay={formatted.unit}
                        isChecked={line.isChecked}
                        isUrgent={line.isUrgent}
                        note={line.note}
                        hasQtyOverride={line.hasQtyOverride}
                        urgentLabel={t("common.urgent")}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px dashed var(--line)",
                borderRadius: 14,
                padding: 32,
                textAlign: "center",
                color: "var(--ink-soft)",
                fontSize: 14,
                fontStyle: "italic",
              }}
            >
              All set — every item is checked off below.
            </div>
          )}

          {recentLines.length > 0 && (
            <section className="list-recent">
              <div className="recent-head">
                <h4 className="serif">
                  <CheckCircle2 /> Recently bought
                </h4>
                <span className="count">{recentLines.length}</span>
              </div>
              {recentLines.map((line) => {
                const formatted = formatQuantity(line.totalQty, line.unit, { locale });
                return (
                  <RecentItem
                    key={line.key}
                    ingredientId={line.ingredient.id}
                    emoji={line.ingredient.emoji}
                    name={nameOf(line)}
                    qtyDisplay={formatted.qty}
                    unitDisplay={formatted.unit}
                  />
                );
              })}
            </section>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {activeListId && (
                <ShareButton
                  listId={activeListId}
                  initialMembers={members.map((m) => ({
                    userId: m.userId,
                    displayName: m.displayName,
                    role: m.role,
                  }))}
                />
              )}
              <ResyncButton />
            </div>
            <FinishShoppingButton disabled={totalLines === 0} />
          </div>
        </>
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
      <h3
        className="serif"
        style={{ fontWeight: 400, fontSize: 22, margin: 0, color: "var(--ink)" }}
      >
        Your list is empty
      </h3>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        Use Quick-add above, or open a recipe and tap{" "}
        <strong>Add to shopping list</strong>.
      </p>
    </div>
  );
}
