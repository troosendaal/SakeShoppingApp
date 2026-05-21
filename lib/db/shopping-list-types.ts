// Pure types for the shopping list. Safe in Client Components.

import type { IngredientLite, UnitType } from "./recipe-types";

export type ListSource =
  | {
      kind: "recipe";
      recipeId: string;
      recipeTitle: string;
      contributionQty: number;
      contributionUnit: string;
    }
  | { kind: "adhoc"; contributionQty: number; contributionUnit: string };

export type MergedLine = {
  // Stable key for React + line-state lookups.
  key: string;
  ingredient: IngredientLite;
  unitType: UnitType;
  totalQty: number;
  unit: string;
  sources: ListSource[];
  isChecked: boolean;
  isUrgent: boolean;
  note: string | null;
  // True when the user has manually overridden the auto-summed quantity
  // and/or unit. Used in the UI to show an "edited" hint and offer reset.
  hasQtyOverride: boolean;
};

export type ListCategoryGroup = {
  categoryId: string;
  categorySlug: string;
  categoryEmoji: string;
  categoryName: string;
  position: number;
  isHidden: boolean;
  lines: MergedLine[];
};

export type GroupedList = {
  listId: string;
  groups: ListCategoryGroup[];
  // Anything in a hidden category falls into here, pinned to the bottom.
  otherGroup: ListCategoryGroup | null;
};
