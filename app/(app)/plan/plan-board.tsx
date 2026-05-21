"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Clock, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { MealSlot, PlanEntry } from "@/lib/db/meal-plan";
import type { RecipePickerOption } from "@/components/recipe-picker";
import { AddMealButton } from "./add-meal";
import { RemoveEntryButton } from "./remove-entry";
import { addMealPlanEntry } from "./actions";

type DayData = {
  dateIso: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  entries: PlanEntry[];
};

const SLOT_CAT: Record<MealSlot, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
};

function defaultSlotFor(cat: string): MealSlot {
  if (cat === "breakfast") return "breakfast";
  if (cat === "lunch") return "lunch";
  if (cat === "dinner") return "dinner";
  return "snack";
}

export function PlanBoard({
  weekStart,
  days,
  recipes,
}: {
  weekStart: string;
  days: DayData[];
  recipes: RecipePickerOption[];
}) {
  const sensors = useSensors(
    // Require a small drag distance so clicks on the tile don't accidentally
    // become drags — keyboard sensor for accessibility.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const [draggingRecipeId, setDraggingRecipeId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [drawerQuery, setDrawerQuery] = useState("");

  const draggingRecipe = useMemo(
    () => recipes.find((r) => r.id === draggingRecipeId) ?? null,
    [recipes, draggingRecipeId],
  );

  const filteredRecipes = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      `${r.title} ${r.meal_category}`.toLowerCase().includes(q),
    );
  }, [recipes, drawerQuery]);

  function onDragStart(e: DragStartEvent) {
    const recipeId = e.active.data.current?.recipeId as string | undefined;
    if (recipeId) setDraggingRecipeId(recipeId);
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingRecipeId(null);
    const recipeId = e.active.data.current?.recipeId as string | undefined;
    const date = e.over?.data.current?.date as string | undefined;
    if (!recipeId || !date) return;
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    startTransition(async () => {
      await addMealPlanEntry({
        weekStart,
        date,
        mealSlot: defaultSlotFor(recipe.meal_category),
        recipeId,
        servings: recipe.base_servings,
      });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingRecipeId(null)}
    >
      <div className="week-grid">
        {days.map((day) => (
          <DroppableDay
            key={day.dateIso}
            day={day}
            weekStart={weekStart}
            recipes={recipes}
          />
        ))}
      </div>

      <div className="recipe-drawer">
        <div className="drawer-head">
          <h3 className="serif">
            Drag from <em>recipes.</em>
          </h3>
          <div className="drawer-search">
            <Search />
            <input
              value={drawerQuery}
              onChange={(e) => setDrawerQuery(e.target.value)}
              placeholder="Search to filter…"
            />
          </div>
        </div>
        {filteredRecipes.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: "var(--ink-soft)",
              fontStyle: "italic",
              padding: "4px 2px",
            }}
          >
            {drawerQuery
              ? `No recipes match "${drawerQuery}".`
              : "No recipes yet — add one on the Recipes tab."}
          </div>
        ) : (
          <div className="recipe-strip">
            {filteredRecipes.map((r) => (
              <DraggableRecipeTile key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingRecipe && (
          <div
            className="recipe-tile"
            style={{ pointerEvents: "none", cursor: "grabbing" }}
          >
            <div className="tile-cat">{draggingRecipe.meal_category}</div>
            <div className="tile-row">
              <div className="tile-emoji">{draggingRecipe.hero_emoji}</div>
              <div className="tile-title serif">{draggingRecipe.title}</div>
            </div>
            <div className="tile-meta">{draggingRecipe.base_servings} srv</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableDay({
  day,
  weekStart,
  recipes,
}: {
  day: DayData;
  weekStart: string;
  recipes: RecipePickerOption[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${day.dateIso}`,
    data: { date: day.dateIso },
  });
  return (
    <div
      ref={setNodeRef}
      className={`day${day.isToday ? " today" : ""}${isOver ? " drag-over" : ""}`}
    >
      <div className="day-head">
        <span className="name">
          {day.dayName}
          {day.isToday ? " · today" : ""}
        </span>
        <span className="date">{day.dayNumber}</span>
      </div>
      <div className="day-body">
        {day.entries.map((e) => (
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
          weekStart={weekStart}
          date={day.dateIso}
          recipes={recipes}
        />
      </div>
    </div>
  );
}

function DraggableRecipeTile({ recipe }: { recipe: RecipePickerOption }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe:${recipe.id}`,
    data: { recipeId: recipe.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="recipe-tile"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
    >
      <div className="tile-cat">{recipe.meal_category}</div>
      <div className="tile-row">
        <div className="tile-emoji">{recipe.hero_emoji}</div>
        <div className="tile-title serif">{recipe.title}</div>
      </div>
      <div className="tile-meta">
        <Clock size={11} /> {recipe.base_servings} srv
      </div>
    </div>
  );
}
