// Unit conversion + formatting for the shopping list.
//
// Hard rule: conversion only happens WITHIN a unit type. Mass <-> mass and
// volume <-> volume work. Mass <-> volume does not, because that needs an
// ingredient-specific density (1 cup of flour weighs much less than 1 cup of
// honey). Count units don't convert to each other either — 1 clove of garlic
// is not 1 bulb.

export type UnitType = "mass" | "volume" | "count";

// Factor to the canonical base of each type (grams for mass, ml for volume).
const MASS_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892, // US teaspoon
  tbsp: 14.7868, // US tablespoon
  cup: 240, // US cup
  fl_oz: 29.5735,
};

const COUNT_UNITS = new Set([
  "whole",
  "pinch",
  "bunch",
  "bulb",
  "clove",
  "can",
  "jar",
  "pack",
  "slice",
]);

export function unitTypeOf(unit: string): UnitType | null {
  if (unit in MASS_TO_G) return "mass";
  if (unit in VOLUME_TO_ML) return "volume";
  if (COUNT_UNITS.has(unit)) return "count";
  return null;
}

export function convert(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  const ft = unitTypeOf(fromUnit);
  const tt = unitTypeOf(toUnit);
  if (!ft || !tt) throw new Error(`Unknown unit: ${fromUnit} or ${toUnit}`);
  if (ft !== tt) {
    throw new Error(
      `Cannot convert ${fromUnit} (${ft}) to ${toUnit} (${tt}) — different unit types`,
    );
  }
  if (ft === "count") {
    // Count units don't convert across each other (a clove ≠ a bulb).
    throw new Error(`Cannot convert count unit ${fromUnit} to ${toUnit}`);
  }
  const table = ft === "mass" ? MASS_TO_G : VOLUME_TO_ML;
  return (quantity * table[fromUnit]) / table[toUnit];
}

// Pick a sensible display unit for the given quantity. e.g. 1200g → 1.2 kg.
export function chooseDisplayUnit(
  quantity: number,
  unit: string,
  unitSystem: "metric" | "imperial" = "metric",
): { quantity: number; unit: string } {
  const ut = unitTypeOf(unit);
  if (!ut) return { quantity, unit };

  if (ut === "mass") {
    if (unitSystem === "metric") {
      if (unit === "g" && quantity >= 1000) return { quantity: quantity / 1000, unit: "kg" };
      if (unit === "kg" && quantity < 1) return { quantity: quantity * 1000, unit: "g" };
    } else {
      if (unit === "oz" && quantity >= 16) return { quantity: quantity / 16, unit: "lb" };
    }
  } else if (ut === "volume") {
    if (unitSystem === "metric") {
      if (unit === "ml" && quantity >= 1000) return { quantity: quantity / 1000, unit: "l" };
      if (unit === "l" && quantity < 1) return { quantity: quantity * 1000, unit: "ml" };
    }
  }
  return { quantity, unit };
}

// Locale-aware number formatting. Strips trailing zeros, max 1 decimal.
export function formatQuantity(
  quantity: number,
  unit: string,
  opts: { locale?: string; unitSystem?: "metric" | "imperial" } = {},
): { qty: string; unit: string } {
  const { locale = "en", unitSystem = "metric" } = opts;
  const display = chooseDisplayUnit(quantity, unit, unitSystem);
  const rounded =
    Math.abs(display.quantity - Math.round(display.quantity)) < 0.05
      ? Math.round(display.quantity)
      : Math.round(display.quantity * 10) / 10;
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return { qty: formatter.format(rounded), unit: display.unit };
}
