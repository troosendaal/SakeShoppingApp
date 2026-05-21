// Pure parser for free-text ingredient lines like
//   "2 onions"
//   "200 g flour"
//   "1 lemon, 6 eggs, 1tbsp olive oil"
// Client-Component safe — no server imports.

export type ParsedItem = {
  raw: string;
  quantity: number;
  unit: string | null; // null if not detected
  name: string;
};

// Common written-out / abbreviated unit forms → canonical token used in the
// database `recipe_ingredients.unit` column.
const UNIT_ALIASES: Record<string, string> = {
  g: "g", gr: "g", gram: "g", grams: "g", gramme: "g", grammes: "g",
  kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  fl_oz: "fl_oz", "fl-oz": "fl_oz",
  whole: "whole",
  pinch: "pinch", pinches: "pinch",
  bunch: "bunch", bunches: "bunch",
  bulb: "bulb", bulbs: "bulb",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can",
  jar: "jar", jars: "jar",
  pack: "pack", packs: "pack", packet: "pack", packets: "pack",
  slice: "slice", slices: "slice",
};

export function parseBulkIngredients(text: string): ParsedItem[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseOne);
}

function parseOne(raw: string): ParsedItem {
  // Try qty + (optional unit) + name. Accept "1", "1.5", "1,5", "1/2".
  // Pattern: leading number, optional whitespace, optional alpha token (unit),
  // then everything else is the name.
  const m = raw.match(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*([a-zA-Z_-]+)?\s*(.+)?$/);
  if (m) {
    const qty = parseFraction(m[1]);
    const maybeUnit = (m[2] || "").toLowerCase();
    const rest = (m[3] || "").trim();

    if (maybeUnit && UNIT_ALIASES[maybeUnit]) {
      return {
        raw,
        quantity: qty,
        unit: UNIT_ALIASES[maybeUnit],
        name: rest,
      };
    }
    // The "unit" word wasn't a known unit — fold it back into the name.
    const name = (maybeUnit ? `${m[2]} ${rest}` : rest).trim();
    if (name) {
      return { raw, quantity: qty, unit: null, name };
    }
  }

  // No usable qty → assume 1, the whole string is the name.
  return { raw, quantity: 1, unit: null, name: raw };
}

function parseFraction(s: string): number {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => Number(x.trim()));
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  return Number(s.replace(",", "."));
}

// Match a parsed ingredient name against the canonical catalog.
// Returns the best ingredient or null.
export function matchIngredient<
  T extends { name_en: string; name_nl: string; name_fr: string },
>(name: string, ingredients: T[]): T | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const stripped = q.replace(/s$/, ""); // crude plural strip

  // 1. Exact match on any of the 3 language names (or singular form)
  const exact = ingredients.find((i) => {
    const en = i.name_en.toLowerCase();
    const nl = i.name_nl.toLowerCase();
    const fr = i.name_fr.toLowerCase();
    return (
      en === q || nl === q || fr === q ||
      en === stripped || nl === stripped || fr === stripped
    );
  });
  if (exact) return exact;

  // 2. Substring match either way (catalog name contains query OR query
  //    contains catalog name — handles "yellow onion" matching "Onion").
  return (
    ingredients.find((i) => {
      const names = [i.name_en, i.name_nl, i.name_fr].map((n) => n.toLowerCase());
      return names.some((n) => n && (n.includes(q) || q.includes(n)));
    }) ?? null
  );
}
