import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Plus,
  Search,
  ShoppingBasket,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";

type MealCat = "breakfast" | "lunch" | "dinner";

type Slot = { cat: MealCat; emoji: string; title: string; servings: number };
type Day = { name: string; date: number; today?: boolean; slots: Slot[]; empties?: string[] };

const WEEK: Day[] = [
  {
    name: "Mon",
    date: 18,
    slots: [
      { cat: "breakfast", emoji: "🥐", title: "Croissants & coffee", servings: 2 },
      { cat: "dinner", emoji: "🍝", title: "Pasta al limone", servings: 4 },
    ],
    empties: ["add meal"],
  },
  {
    name: "Tue · today",
    date: 19,
    today: true,
    slots: [
      { cat: "breakfast", emoji: "🥚", title: "Shakshuka", servings: 2 },
      { cat: "lunch", emoji: "🥗", title: "Aubergine bowls", servings: 2 },
      { cat: "dinner", emoji: "🍗", title: "Thai green curry", servings: 4 },
    ],
  },
  {
    name: "Wed",
    date: 20,
    slots: [{ cat: "dinner", emoji: "🍚", title: "Mushroom risotto", servings: 4 }],
    empties: ["add meal"],
  },
  {
    name: "Thu",
    date: 21,
    slots: [{ cat: "dinner", emoji: "🐟", title: "Salmon, broccoli", servings: 2 }],
    empties: ["add meal"],
  },
  {
    name: "Fri",
    date: 22,
    slots: [{ cat: "dinner", emoji: "🍕", title: "Pizza night", servings: 4 }],
    empties: ["add meal"],
  },
  { name: "Sat", date: 23, slots: [], empties: ["breakfast", "lunch", "dinner"] },
  {
    name: "Sun",
    date: 24,
    slots: [{ cat: "lunch", emoji: "🍰", title: "Olive oil cake", servings: 8 }],
    empties: ["add meal"],
  },
];

const DRAWER_TILES = [
  { cat: "Dinner", emoji: "🍝", title: "Pasta al limone", meta: "35 min · 4 srv" },
  { cat: "Breakfast", emoji: "🥚", title: "Shakshuka", meta: "25 min · 4 srv" },
  { cat: "Dinner", emoji: "🍚", title: "Mushroom risotto", meta: "1 h 10 · 4 srv" },
  { cat: "Lunch", emoji: "🥗", title: "Aubergine bowls", meta: "45 min · 4 srv" },
  { cat: "Dinner", emoji: "🍗", title: "Thai green curry", meta: "50 min · 4 srv" },
  { cat: "Dessert", emoji: "🍰", title: "Olive oil cake", meta: "1 h 30 · 8 srv" },
  { cat: "Sweets", emoji: "🍪", title: "Brown butter cookies", meta: "40 min · 12 srv" },
];

export default function PlanPage() {
  const t = useTranslations();
  const showBanner = !isSupabaseConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.plan.title")} <em>{t("pages.plan.titleEm")}</em>
          </h2>
          <p>{t("pages.plan.subtitle")}</p>
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}

      <div className="week-toolbar">
        <div className="week-nav">
          <button type="button" className="week-nav-btn" aria-label="Previous week">
            <ChevronLeft />
          </button>
          <div>
            <span className="week-label serif">
              Week 21 · <em>May 18 – 24</em>
            </span>
            <span className="week-sub">· this week</span>
          </div>
          <button type="button" className="week-nav-btn" aria-label="Next week">
            <ChevronRight />
          </button>
          <button type="button" className="week-nav-btn" aria-label="Today">
            <Calendar />
          </button>
        </div>
        <div className="week-actions">
          <button type="button" className="btn btn-secondary">
            <Copy /> {t("common.copyLastWeek")}
          </button>
          <button type="button" className="btn btn-primary">
            <ShoppingBasket /> {t("common.buildShoppingList")}
          </button>
        </div>
      </div>

      <div className="week-summary">
        <div className="summary-card">
          <div className="em">🍽️</div>
          <div className="info">
            <div className="val serif">9</div>
            <div className="lbl">Meals planned</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="em">🛒</div>
          <div className="info">
            <div className="val serif">38</div>
            <div className="lbl">Items to buy</div>
          </div>
        </div>
        <div className="summary-card cta">
          <div className="em">⚡</div>
          <div className="info">
            <div className="val serif">5 days</div>
            <div className="lbl">Until next shop</div>
          </div>
        </div>
      </div>

      <div className="week-grid">
        {WEEK.map((day) => (
          <div key={day.date} className={`day${day.today ? " today" : ""}`}>
            <div className="day-head">
              <span className="name">{day.name}</span>
              <span className="date">{day.date}</span>
            </div>
            <div className="day-body">
              {day.slots.map((s, i) => (
                <div key={i} className="meal-slot" data-cat={s.cat}>
                  <div className="slot-type">{s.cat}</div>
                  <div className="slot-title">
                    <span className="slot-emoji">{s.emoji}</span> {s.title}
                  </div>
                  <div className="slot-servings">{s.servings} servings</div>
                  <button
                    type="button"
                    aria-label="Remove"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(255,255,255,.7)",
                      display: "none",
                    }}
                  >
                    <X />
                  </button>
                </div>
              ))}
              {(day.empties ?? []).map((label, i) => (
                <button key={i} type="button" className="slot-empty">
                  <Plus
                    style={{
                      width: 14,
                      height: 14,
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: 3,
                    }}
                  />{" "}
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="recipe-drawer">
        <div className="drawer-head">
          <h3 className="serif">
            Drag from <em>recipes.</em>
          </h3>
          <div className="drawer-search">
            <Search />
            <input placeholder={t("common.search")} />
          </div>
        </div>
        <div className="recipe-strip">
          {DRAWER_TILES.map((tile, i) => (
            <div key={i} className="recipe-tile">
              <div className="tile-cat">{tile.cat}</div>
              <div className="tile-row">
                <div className="tile-emoji">{tile.emoji}</div>
                <div className="tile-title serif">{tile.title}</div>
              </div>
              <div className="tile-meta">
                <Clock /> {tile.meta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
