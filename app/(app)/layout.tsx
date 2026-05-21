import { Topbar } from "@/components/topbar";
import { TabsNav } from "@/components/tabs-nav";

export default function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app">
      <Topbar />
      <TabsNav />
      {children}
    </div>
  );
}
