"use client";

import { GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/bootstrap/i18n/routing";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/utils";
import { NAV_BY_ROLE, type Role } from "./nav-config";

type SidebarProps = {
  role: Role;
  className?: string;
};

export function Sidebar({ role, className }: SidebarProps) {
  const t = useTranslations("shell.nav");
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar",
        className,
      )}
      style={{ width: "var(--edu-sidebar-width, 260px)" }}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="grid size-9 place-items-center rounded-[var(--edu-radius-role-icon)] bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-base font-bold tracking-tight">EduPortal</span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(`${item.href}/`) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--edu-radius-btn)] px-3 py-2 text-sm font-medium transition-colors",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "border-l-2 border-primary bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
