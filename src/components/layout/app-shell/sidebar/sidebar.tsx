"use client";

import { ChevronLeft, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/bootstrap/i18n/routing";
import { tenantUrl } from "@/bootstrap/tenant";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";
import { NAV_BY_ROLE, type NavItem, type Role } from "./nav-config";

type SidebarProps = {
  /** Active tenant — nav hrefs are built as `/t/{tenantId}{item.href}`. */
  tenantId: string;
  role: Role;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
};

export function Sidebar({
  tenantId,
  role,
  collapsed = false,
  onToggle,
  className,
}: SidebarProps) {
  const t = useTranslations("shell.nav");
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-[250ms] ease-in-out",
        className,
      )}
      style={{
        width: collapsed
          ? "var(--edu-sidebar-width-collapsed, 72px)"
          : "var(--edu-sidebar-width, 260px)",
      }}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b border-border px-5",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[var(--edu-radius-role-icon)] bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        {!collapsed && (
          <span className="truncate text-base font-bold tracking-tight">
            EduPortal
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const href = tenantUrl(tenantId, item.href);
            return (
              <NavLink
                key={item.href}
                item={item}
                href={href}
                label={t(item.labelKey)}
                collapsed={collapsed}
                active={
                  pathname === href ||
                  (pathname?.startsWith(`${href}/`) ?? false)
                }
              />
            );
          })}
        </nav>
      </ScrollArea>

      {onToggle && (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            aria-expanded={!collapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-[var(--edu-radius-btn)] px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn(
                "size-4 shrink-0 transition-transform duration-[250ms]",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && <span>{t("collapseSidebar")}</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

function NavLink({
  item,
  href,
  label,
  active,
  collapsed,
}: {
  item: NavItem;
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[var(--edu-radius-btn)] py-2 text-sm font-medium transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed ? "justify-center px-0" : "px-3",
        active &&
          "border-primary border-l-[3px] bg-primary/12 font-bold text-primary",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  // Collapsed: the label moves into an accessible tooltip on hover/focus.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
