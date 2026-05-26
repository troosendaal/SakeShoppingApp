"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, History, ShoppingBasket, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/recipes", key: "recipes", icon: BookOpen },
  { href: "/plan", key: "plan", icon: CalendarDays },
  { href: "/list", key: "list", icon: ShoppingBasket },
  { href: "/history", key: "history", icon: History },
  { href: "/shared", key: "shared", icon: Users },
] as const;

export function TabsNav({ listBadge = 0 }: { listBadge?: number }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const badge = key === "list" && listBadge > 0 ? listBadge : undefined;
        return (
          <Link key={key} href={href} className={`tab${active ? " active" : ""}`}>
            <Icon />
            {t(key)}
            {badge !== undefined && <span className="badge">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
