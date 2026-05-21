import { Clock, Heart, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";

type RecipeCat = "breakfast" | "lunch" | "dinner" | "dessert" | "sweets" | "snack";

type RecipeCard = {
  cat: RecipeCat;
  emoji: string;
  title: string;
  prep: string;
  servings: number;
  tags: string[];
};

const RECIPES: RecipeCard[] = [
  {
    cat: "dinner",
    emoji: "🍝",
    title: "Pasta al limone",
    prep: "35 min",
    servings: 4,
    tags: ["Pasta", "Veggie"],
  },
  {
    cat: "breakfast",
    emoji: "🥚",
    title: "Shakshuka",
    prep: "25 min",
    servings: 4,
    tags: ["Eggs", "Veggie"],
  },
  {
    cat: "dinner",
    emoji: "🍚",
    title: "Mushroom risotto",
    prep: "1 h 10",
    servings: 4,
    tags: ["Rice", "Veggie"],
  },
  {
    cat: "lunch",
    emoji: "🥗",
    title: "Aubergine bowls",
    prep: "45 min",
    servings: 4,
    tags: ["Bowl", "Veggie"],
  },
  {
    cat: "dinner",
    emoji: "🍗",
    title: "Thai green curry",
    prep: "50 min",
    servings: 4,
    tags: ["Curry", "Meat"],
  },
  {
    cat: "dessert",
    emoji: "🍰",
    title: "Olive oil cake",
    prep: "1 h 30",
    servings: 8,
    tags: ["Cake"],
  },
  {
    cat: "sweets",
    emoji: "🍪",
    title: "Brown butter cookies",
    prep: "40 min",
    servings: 12,
    tags: ["Cookies"],
  },
  {
    cat: "snack",
    emoji: "🥖",
    title: "Garlic focaccia",
    prep: "2 h 30",
    servings: 8,
    tags: ["Bread"],
  },
];

export default function RecipesPage() {
  const t = useTranslations();
  const showBanner = !isSupabaseConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.recipes.title")} <em>{t("pages.recipes.titleEm")}</em>
          </h2>
          <p>{t("pages.recipes.subtitle")}</p>
        </div>
        <div className="search">
          <Search />
          <input placeholder={t("common.search")} />
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}

      <div className="recipe-grid">
        {RECIPES.map((r, i) => (
          <article key={i} className="recipe-card" data-cat={r.cat}>
            <div className="cat-strip" />
            <div className="body">
              <div className="meta">
                <span>{r.cat}</span>
                <Heart size={14} />
              </div>
              <div className="hero">
                <div className="hero-emoji">{r.emoji}</div>
                <div className="hero-times">
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    <Clock size={12} /> {r.prep}
                  </div>
                  <div>{r.servings} srv</div>
                </div>
              </div>
              <h3 className="title serif">{r.title}</h3>
              <div className="tags">
                {r.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
        <article
          className="recipe-card"
          style={{ borderStyle: "dashed", background: "transparent", boxShadow: "none" }}
        >
          <div className="body" style={{ background: "transparent", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <Plus size={32} color="var(--ink-soft)" />
            <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Add a new recipe</div>
          </div>
        </article>
      </div>
    </>
  );
}
