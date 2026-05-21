import { Topbar } from "@/components/topbar";
import { TabsNav } from "@/components/tabs-nav";
import { getCurrentUser, initialsFrom } from "@/lib/user";

export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const initials = user ? initialsFrom(user.displayName) : "?";

  return (
    <div className="app">
      <Topbar initials={initials} displayName={user?.displayName} />
      <TabsNav />
      {children}
    </div>
  );
}
