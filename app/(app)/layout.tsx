import { Topbar } from "@/components/topbar";
import { TabsNav } from "@/components/tabs-nav";
import { getActiveListUncheckedCount } from "@/lib/db/shopping-list";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { getCurrentUser, initialsFrom } from "@/lib/user";

export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const initials = user ? initialsFrom(user.displayName) : "?";

  // Live count of unchecked items on the active list → topbar tab badge.
  // Skipped if Supabase isn't configured or the count query throws so the
  // shell never breaks because of a badge.
  let listBadge = 0;
  if (user && isSupabaseConfigured()) {
    try {
      listBadge = await getActiveListUncheckedCount();
    } catch (err) {
      console.error("[layout] list badge count failed:", err);
    }
  }

  return (
    <div className="app">
      <Topbar initials={initials} displayName={user?.displayName} />
      <TabsNav listBadge={listBadge} />
      {children}
    </div>
  );
}
