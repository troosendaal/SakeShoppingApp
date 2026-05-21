import { getLocale, getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import {
  addDays,
  dayName,
  formatWeekRange,
  isoDate,
  isSameDay,
  parseIsoDate,
  startOfWeek,
} from "@/lib/date-utils";
import { getMealPlanForWeek, type MealSlot, type PlanEntry } from "@/lib/db/meal-plan";
import { getMyRecipes } from "@/lib/db/recipes";
import { errorMessage } from "@/lib/errors";
import { BuildListButton } from "./build-list-button";
import { PlanBoard } from "./plan-board";
import { WeekNav } from "./week-nav";

const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const t = await getTranslations();
  const _locale = await getLocale();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header t={t} />
        <ConfigureBanner message={t("common.configureSupabase")} />
      </>
    );
  }

  const params = await searchParams;
  const weekStartDate = (() => {
    if (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)) {
      return startOfWeek(parseIsoDate(params.week));
    }
    return startOfWeek(new Date());
  })();
  const weekStartIso = isoDate(weekStartDate);
  const today = new Date();
  const isCurrentWeek = isSameDay(weekStartDate, startOfWeek(today));
  const { weekNumber, range } = formatWeekRange(weekStartDate);

  let plan: Awaited<ReturnType<typeof getMealPlanForWeek>> | null = null;
  let recipes: Awaited<ReturnType<typeof getMyRecipes>> = [];
  let loadError: string | null = null;
  try {
    [plan, recipes] = await Promise.all([
      getMealPlanForWeek(weekStartIso),
      getMyRecipes(),
    ]);
  } catch (err) {
    console.error("[plan] load failed:", err);
    loadError = errorMessage(err);
  }

  const recipeOptions = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    hero_emoji: r.hero_emoji,
    base_servings: r.base_servings,
    meal_category: r.meal_category as string,
  }));

  const entriesByDay = new Map<string, PlanEntry[]>();
  for (const e of plan?.entries ?? []) {
    const arr = entriesByDay.get(e.date) ?? [];
    arr.push(e);
    entriesByDay.set(e.date, arr);
  }
  for (const arr of entriesByDay.values()) {
    arr.sort((a, b) => {
      const slotDiff = SLOT_ORDER.indexOf(a.mealSlot) - SLOT_ORDER.indexOf(b.mealSlot);
      if (slotDiff !== 0) return slotDiff;
      return a.position - b.position;
    });
  }

  const totalEntries = plan?.entries.length ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    const iso = isoDate(d);
    return {
      dateIso: iso,
      dayName: dayName(d),
      dayNumber: d.getDate(),
      isToday: isSameDay(d, today),
      entries: entriesByDay.get(iso) ?? [],
    };
  });

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
          Couldn't load meal plan: {loadError}
        </div>
      )}

      <div className="week-toolbar">
        <WeekNav
          weekStart={weekStartIso}
          weekLabel={range}
          weekNumber={weekNumber}
          isCurrentWeek={isCurrentWeek}
        />
        <div className="week-actions">
          <BuildListButton weekStart={weekStartIso} entryCount={totalEntries} />
        </div>
      </div>

      {recipes.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--line)",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
            color: "var(--ink-soft)",
            fontSize: 14,
          }}
        >
          You need at least one recipe to plan meals. Add one on the{" "}
          <strong>Recipes</strong> tab first.
        </div>
      ) : (
        <PlanBoard
          weekStart={weekStartIso}
          days={days}
          recipes={recipeOptions}
        />
      )}
    </>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div className="page-head">
      <div>
        <h2>
          {t("pages.plan.title")} <em>{t("pages.plan.titleEm")}</em>
        </h2>
        <p>{t("pages.plan.subtitle")}</p>
      </div>
    </div>
  );
}
