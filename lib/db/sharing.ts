import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ListMember = {
  userId: string;
  displayName: string;
  email: string | null;
  role: "owner" | "editor";
  joinedAt: string;
};

export type SharedListSummary = {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  updatedAt: string;
  ownerName: string;
  memberCount: number;
  itemCount: number;
};

// Members of a given list, owner first.
export async function getListMembers(listId: string): Promise<ListMember[]> {
  const supabase = await createClient();

  // Owner from shopping_lists; collaborators from list_members.
  const [{ data: list }, { data: members }] = await Promise.all([
    supabase
      .from("shopping_lists")
      .select("owner_id, profile:profiles!shopping_lists_owner_id_fkey ( display_name )")
      .eq("id", listId)
      .maybeSingle(),
    supabase
      .from("list_members")
      .select(
        "user_id, role, joined_at, profile:profiles!list_members_user_id_fkey ( display_name )",
      )
      .eq("list_id", listId)
      .order("joined_at", { ascending: true }),
  ]);

  type RawProfile = { display_name: string | null } | { display_name: string | null }[] | null;
  function profileName(p: RawProfile): string {
    if (!p) return "(unknown)";
    const single = Array.isArray(p) ? p[0] : p;
    return single?.display_name?.trim() || "(unknown)";
  }

  const out: ListMember[] = [];
  if (list) {
    out.push({
      userId: list.owner_id as string,
      displayName: profileName(list.profile as RawProfile),
      email: null,
      role: "owner",
      joinedAt: "",
    });
  }
  for (const m of members ?? []) {
    if (m.user_id === list?.owner_id) continue; // already added as owner
    out.push({
      userId: m.user_id as string,
      displayName: profileName(m.profile as RawProfile),
      email: null,
      role: (m.role as "editor") ?? "editor",
      joinedAt: (m.joined_at as string) ?? "",
    });
  }
  return out;
}

// Lists I'm a member of (excluding ones I own).
export async function getMySharedLists(): Promise<SharedListSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberRows, error } = await supabase
    .from("list_members")
    .select(
      `list_id,
       list:shopping_lists (
         id, title, status, updated_at, owner_id,
         owner_profile:profiles!shopping_lists_owner_id_fkey ( display_name ),
         list_recipes ( recipe_id ),
         list_adhoc_items ( id )
       )`,
    )
    .eq("user_id", user.id);
  if (error) throw error;

  type RawList = {
    id: string;
    title: string;
    status: "active" | "completed" | "archived";
    updated_at: string;
    owner_id: string;
    owner_profile: { display_name: string | null } | { display_name: string | null }[] | null;
    list_recipes: Array<unknown> | null;
    list_adhoc_items: Array<unknown> | null;
  };

  const out: SharedListSummary[] = [];
  for (const row of (memberRows ?? []) as Array<{
    list_id: string;
    list: RawList | RawList[] | null;
  }>) {
    const l = Array.isArray(row.list) ? row.list[0] : row.list;
    if (!l) continue;
    if (l.owner_id === user.id) continue; // skip my own lists

    const owner = Array.isArray(l.owner_profile) ? l.owner_profile[0] : l.owner_profile;
    out.push({
      id: l.id,
      title: l.title || "Shopping list",
      status: l.status,
      updatedAt: l.updated_at,
      ownerName: owner?.display_name?.trim() || "(unknown)",
      memberCount: 0, // computed below
      itemCount:
        (l.list_recipes?.length ?? 0) + (l.list_adhoc_items?.length ?? 0),
    });
  }

  // Fetch member counts in a second round-trip (small number of lists,
  // OK to do one count per list).
  await Promise.all(
    out.map(async (s) => {
      const { count } = await supabase
        .from("list_members")
        .select("*", { count: "exact", head: true })
        .eq("list_id", s.id);
      s.memberCount = count ?? 0;
    }),
  );

  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return out;
}
