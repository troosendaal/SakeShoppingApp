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
import { AddMealButton } from "./add-meal";
import { BuildListButton } from "./build-list-button";
import { RemoveEntryButton } from "./remove-entry";
import { WeekNav } from "./week-nav";

const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
// dnd-kit-friendly mapping from meal_slot enum → the colour bucket the CSS
// already has on .meal-slot[data-cat="..."]. "snack" reuses the slate look.
const SLOT_CAT: Record<MealSlot, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
};

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

  // Resolve which week we're viewing
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

  // Index entries by day for quick render lookup
  const entriesByDay = new Map<string, PlanEntry[]>();
  for (const e of plan?.entries ?? []) {
    const arr = entriesByDay.get(e.date) ?? [];
    arr.push(e);
    entriesByDay.set(e.date, arr);
  }
  // Sort each day's entries by slot order, then position
  for (const arr of entriesByDay.values()) {
    arr.sort((a, b) => {
      const slotDiff = SLOT_ORDER.indexOf(a.mealSlot) - SLOT_ORDER.indexOf(b.mealSlot);
      if (slotDiff !== 0) return slotDiff;
      return a.position - b.position;
    });
  }

  const totalEntries = plan?.entries.length ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

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
        <div className="week-grid">
          {days.map((day) => {
            const dateIso = isoDate(day);
            const isToday = isSameDay(day, today);
            const dayEntries = entriesByDay.get(dateIso) ?? [];
            return (
              <div key={dateIso} className={`day${isToday ? " today" : ""}`}>
                <div className="day-head">
                  <span className="name">
                    {dayName(day)}
                    {isToday ? " · today" : ""}
                  </span>
                  <span className="date">{day.getDate()}</span>
                </div>
                <div className="day-body">
                  {dayEntries.map((e) => (
                    <div
                      key={e.id}
                      className="meal-slot"
                      data-cat={SLOT_CAT[e.mealSlot]}
                      style={{ cursor: "default", position: "relative" }}
                    >
                      <div className="slot-type">{e.mealSlot}</div>
                      <div className="slot-title">
                        <span className="slot-emoji">{e.recipe.hero_emoji}</span>{" "}
                        {e.recipe.title}
                      </div>
                      <div className="slot-servings">
                        {e.servings} serving{e.servings === 1 ? "" : "s"}
                      </div>
                      <RemoveEntryButton entryId={e.id} />
                    </div>
                  ))}
                  <AddMealButton
                    weekStart={weekStartIso}
                    date={dateIso}
                    recipes={recipeOptions}
                  />
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
          {t("pages.plan.title")} <em>{t("pages.plan.titleEm")}</em>
        </h2>
        <p>{t("pages.plan.subtitle")}</p>
      </div>
    </div>
  );
}
