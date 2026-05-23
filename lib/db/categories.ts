import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CategoryOption = {
  id: string;
  slug: string;
  emoji: string;
  name_en: string;
  name_nl: string;
  name_fr: string;
  default_position: number;
};

// All 13 categories in default order, for ingredient-create modals etc.
export async function listCategories(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, emoji, name_en, name_nl, name_fr, default_position")
    .order("default_position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryOption[];
}
