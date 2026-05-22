import "server-only";
import { createClient } from "@/lib/supabase/server";
import { convert, unitTypeOf } from "@/lib/units";
import type { IngredientLite, Locale, UnitType } from "./recipe-types";
import type {
  GroupedList,
  ListCategoryGroup,
  ListSource,
  MergedLine,
} from "./shopping-list-types";

export type CompletedListSummary = {
  id: string;
  title: string;
  completedAt: string | null; // ISO
  createdAt: string;
  recipeCount: number;
  adhocCount: number;
  boughtCount: number;
};

// Get the user's currently-active shopping list, creating one if none exists.
export async function getOrCreateActiveList(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: selErr } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return { id: existing.id as string };

  const { data: created, error: insErr } = await supabase
    .from("shopping_lists")
    .insert({ owner_id: user.id, title: "Shopping list", status: "active" })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return { id: created.id as string };
}

// Lightweight summary used by the shared-list views.
export async function getListSummary(
  listId: string,
): Promise<
  | { id: string; title: string; status: "active" | "completed" | "archived"; ownerId: string }
  | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, title, status, owner_id")
    .eq("id", listId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    title: (data.title as string) ?? "Shopping list",
    status: data.status as "active" | "completed" | "archived",
    ownerId: data.owner_id as string,
  };
}

// Same grouped-list output as getActiveListGrouped but for a specific list
// id (used by /shared/[id]). RLS does the access check — if the caller
// isn't owner-or-member, the queries return empty and we return an empty
// GroupedList.
export async function getListGroupedById(
  locale: Locale,
  listId: string,
): Promise<GroupedList> {
  return fetchAndGroupList(locale, listId);
}

// Fetch everything needed to render the list, grouped and summed.
export async function getActiveListGrouped(locale: Locale): Promise<GroupedList> {
  const list = await getOrCreateActiveList();
  return fetchAndGroupList(locale, list.id);
}

async function fetchAndGroupList(
  locale: Locale,
  listId: string,
): Promise<GroupedList> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const list = { id: listId };

  // ---- raw queries (parallel) ----
  const [
    { data: recipeRows, error: lrErr },
    { data: adhocRows, error: adErr },
    { data: stateRows },
    { data: prefsRows },
    { data: catRows },
  ] = await Promise.all([
    supabase
      .from("list_recipes")
      .select(
        `servings,
         recipe:recipes (
           id, title, base_servings,
           recipe_ingredients (
             quantity, unit, is_optional,
             ingredient:ingredients (
               id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type
             )
           )
         )`,
      )
      .eq("list_id", list.id),
    supabase
      .from("list_adhoc_items")
      .select(
        `quantity, unit,
         ingredient:ingredients (
           id, emoji, name_en, name_nl, name_fr, category_id, canonical_unit_type
         )`,
      )
      .eq("list_id", list.id),
    supabase
      .from("list_line_state")
      .select(
        "ingredient_id, is_checked, is_urgent, note, quantity_override, unit_override",
      )
      .eq("list_id", list.id),
    supabase
      .from("user_category_prefs")
      .select("category_id, position, is_hidden")
      .eq("user_id", user.id),
    supabase
      .from("categories")
      .select("id, slug, emoji, name_en, name_nl, name_fr, default_position")
      .order("default_position", { ascending: true }),
  ]);

  if (lrErr) throw lrErr;
  if (adErr) throw adErr;

  // ---- normalize Supabase's array/object inference quirks ----
  type RawRI = {
    quantity: number;
    unit: string;
    is_optional: boolean;
    ingredient: IngredientLite | IngredientLite[] | null;
  };
  type RawRecipe = {
    servings: number;
    recipe:
      | {
          id: string;
          title: string;
          base_servings: number;
          recipe_ingredients: RawRI[] | null;
        }
      | Array<{
          id: string;
          title: string;
          base_servings: number;
          recipe_ingredients: RawRI[] | null;
        }>
      | null;
  };
  type RawAdhoc = {
    quantity: number;
    unit: string;
    ingredient: IngredientLite | IngredientLite[] | null;
  };
  const normRecipes = ((recipeRows ?? []) as unknown as RawRecipe[]).map((r) => ({
    servings: r.servings,
    recipe: Array.isArray(r.recipe) ? r.recipe[0] : r.recipe,
  }));
  const normAdhocs = ((adhocRows ?? []) as unknown as RawAdhoc[]).map((a) => ({
    quantity: a.quantity,
    unit: a.unit,
    ingredient: Array.isArray(a.ingredient) ? a.ingredient[0] : a.ingredient,
  }));
  function normIng(
    x: IngredientLite | IngredientLite[] | null | undefined,
  ): IngredientLite | null {
    if (!x) return null;
    return (Array.isArray(x) ? x[0] : x) ?? null;
  }

  // ---- build sum buckets keyed by (ingredient_id + unit_type) ----
  type Bucket = {
    ingredient: IngredientLite;
    unitType: UnitType;
    totalQty: number;
    displayUnit: string; // unit we'll display in (the first unit we saw)
    sources: ListSource[];
  };
  const buckets = new Map<string, Bucket>();

  function addContribution(
    ing: IngredientLite,
    quantity: number,
    unit: string,
    source: ListSource,
  ) {
    const ut = unitTypeOf(unit) ?? ing.canonical_unit_type;
    const key = `${ing.id}::${ut}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        ingredient: ing,
        unitType: ut,
        totalQty: 0,
        displayUnit: unit,
        sources: [],
      };
      buckets.set(key, b);
    }
    // Convert into the bucket's display unit (within the same unit type).
    try {
      const converted = ut === "count" && unit !== b.displayUnit
        ? quantity // can't convert count units; treat as separate is ideal,
                   // but we already keyed on unit_type so we accept a small fudge.
        : convert(quantity, unit, b.displayUnit);
      b.totalQty += converted;
    } catch {
      // Incompatible unit — keep the original value and hope for the best.
      b.totalQty += quantity;
    }
    b.sources.push(source);
  }

  for (const lr of normRecipes) {
    const rec = lr.recipe;
    if (!rec) continue;
    const ratio = (lr.servings || rec.base_servings) / rec.base_servings;
    for (const ri of rec.recipe_ingredients ?? []) {
      const ing = normIng(ri.ingredient);
      if (!ing) continue;
      addContribution(ing, ri.quantity * ratio, ri.unit, {
        kind: "recipe",
        recipeId: rec.id,
        recipeTitle: rec.title,
        contributionQty: ri.quantity * ratio,
        contributionUnit: ri.unit,
      });
    }
  }

  for (const ad of normAdhocs) {
    const ing = normIng(ad.ingredient);
    if (!ing) continue;
    addContribution(ing, ad.quantity, ad.unit, {
      kind: "adhoc",
      contributionQty: ad.quantity,
      contributionUnit: ad.unit,
    });
  }

  // ---- apply per-line state (checks, notes, urgent, overrides) ----
  const stateByIngId = new Map<string, {
    is_checked: boolean;
    is_urgent: boolean;
    note: string | null;
    quantity_override: number | null;
    unit_override: string | null;
  }>();
  for (const s of stateRows ?? []) {
    stateByIngId.set(s.ingredient_id as string, {
      is_checked: !!s.is_checked,
      is_urgent: !!s.is_urgent,
      note: (s.note as string | null) ?? null,
      quantity_override: (s.quantity_override as number | null) ?? null,
      unit_override: (s.unit_override as string | null) ?? null,
    });
  }

  const mergedLines: MergedLine[] = [];
  for (const b of buckets.values()) {
    const state = stateByIngId.get(b.ingredient.id);
    let qty = b.totalQty;
    let unit = b.displayUnit;
    const hasQtyOverride =
      state?.quantity_override != null || !!state?.unit_override;
    if (state?.quantity_override != null) qty = state.quantity_override;
    if (state?.unit_override) unit = state.unit_override;

    mergedLines.push({
      key: `${b.ingredient.id}::${b.unitType}`,
      ingredient: b.ingredient,
      unitType: b.unitType,
      totalQty: qty,
      unit,
      sources: b.sources,
      isChecked: state?.is_checked ?? false,
      isUrgent: state?.is_urgent ?? false,
      note: state?.note ?? null,
      hasQtyOverride,
    });
  }

  // ---- group by category, apply user sort prefs ----
  const catById = new Map<
    string,
    {
      id: string;
      slug: string;
      emoji: string;
      name_en: string;
      name_nl: string;
      name_fr: string;
      default_position: number;
    }
  >();
  for (const c of catRows ?? []) {
    catById.set(c.id as string, {
      id: c.id as string,
      slug: c.slug as string,
      emoji: c.emoji as string,
      name_en: c.name_en as string,
      name_nl: c.name_nl as string,
      name_fr: c.name_fr as string,
      default_position: c.default_position as number,
    });
  }
  const prefByCat = new Map<string, { position: number; is_hidden: boolean }>();
  for (const p of prefsRows ?? []) {
    prefByCat.set(p.category_id as string, {
      position: p.position as number,
      is_hidden: !!p.is_hidden,
    });
  }

  const groupsById = new Map<string, ListCategoryGroup>();
  for (const line of mergedLines) {
    const catId = line.ingredient.category_id;
    const cat = catById.get(catId);
    if (!cat) continue;
    const pref = prefByCat.get(catId);
    const position = pref?.position ?? cat.default_position;
    const isHidden = pref?.is_hidden ?? false;
    const catName =
      locale === "nl" ? cat.name_nl : locale === "fr" ? cat.name_fr : cat.name_en;

    let group = groupsById.get(catId);
    if (!group) {
      group = {
        categoryId: catId,
        categorySlug: cat.slug,
        categoryEmoji: cat.emoji,
        categoryName: catName,
        position,
        isHidden,
        lines: [],
      };
      groupsById.set(catId, group);
    }
    group.lines.push(line);
  }

  // Sort lines within each group: urgent first, then name alphabetically.
  function lineName(l: MergedLine): string {
    const ing = l.ingredient;
    return locale === "nl" ? ing.name_nl : locale === "fr" ? ing.name_fr : ing.name_en;
  }
  for (const g of groupsById.values()) {
    g.lines.sort((a, b) => {
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
      return lineName(a).localeCompare(lineName(b), locale);
    });
  }

  // Split visible vs hidden, sort by position.
  const visible: ListCategoryGroup[] = [];
  const hidden: ListCategoryGroup[] = [];
  for (const g of groupsById.values()) {
    (g.isHidden ? hidden : visible).push(g);
  }
  visible.sort((a, b) => a.position - b.position);

  let otherGroup: ListCategoryGroup | null = null;
  if (hidden.length > 0) {
    otherGroup = {
      categoryId: "_other",
      categorySlug: "_other",
      categoryEmoji: "📦",
      categoryName: "Other",
      position: 9999,
      isHidden: false,
      lines: hidden.flatMap((g) => g.lines),
    };
  }

  return { listId: list.id, groups: visible, otherGroup };
}

// --------------------------------------------------------------------------
// History — completed / archived lists
// --------------------------------------------------------------------------
// Returns one summary card per past list, newest-completed first.
// recipeCount / adhocCount come from straight row counts; boughtCount is
// the number of items the user actually ticked off via list_line_state.
export async function getCompletedLists(): Promise<CompletedListSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shopping_lists")
    .select(
      `id, title, completed_at, created_at, status,
       list_recipes ( recipe_id ),
       list_adhoc_items ( id ),
       list_line_state ( is_checked )`,
    )
    .eq("owner_id", user.id)
    .in("status", ["completed", "archived"])
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  type Row = {
    id: string;
    title: string;
    completed_at: string | null;
    created_at: string;
    list_recipes: Array<unknown> | null;
    list_adhoc_items: Array<unknown> | null;
    list_line_state: Array<{ is_checked: boolean }> | null;
  };

  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    recipeCount: r.list_recipes?.length ?? 0,
    adhocCount: r.list_adhoc_items?.length ?? 0,
    boughtCount: (r.list_line_state ?? []).filter((s) => s.is_checked).length,
  }));
}
