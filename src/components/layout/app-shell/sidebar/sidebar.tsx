"use client";

import { ChevronLeft, CircleHelp, GraduationCap } from "lucide-react";
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
import {
  activeNavHref,
  NAV_BY_ROLE,
  type NavItem,
  type Role,
} from "./nav-config";
import { sidebarGridStyle } from "./sidebar-grid";

type SidebarProps = {
  /** Active tenant — nav hrefs are built as `/t/{tenantId}{item.href}`. */
  tenantId: string;
  role: Role;
  collapsed?: boolean;
  onToggle?: () => void;
  /**
   * External user-guide URL (NEXT_PUBLIC_HELP_URL, threaded from the app
   * layout). There is no in-app guide page: when unset the entry does NOT
   * render at all rather than linking nowhere (US-E24.12).
   */
  helpHref?: string;
  className?: string;
};

export function Sidebar({
  tenantId,
  role,
  collapsed = false,
  onToggle,
  helpHref,
  className,
}: SidebarProps) {
  const t = useTranslations("shell.nav");
  const tHeader = useTranslations("shell.header");
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  // One winner: the longest href the pathname sits under (a plain prefix test
  // kept the dashboard lit on every child route).
  const activeHref = activeNavHref(
    pathname,
    items.map((item) => tenantUrl(tenantId, item.href)),
  );

  return (
    // DR-009 US-E16.4: the collapse/expand animation runs on the wrapper's
    // `grid-template-columns` (GPU-friendly) instead of the aside's `width`,
    // which forced layout each frame. The aside fills the single grid track.
    <div
      style={sidebarGridStyle(collapsed)}
      className="h-full shrink-0 motion-safe:transition-[grid-template-columns] motion-safe:duration-[250ms] motion-safe:ease-in-out"
    >
      <aside
        data-collapsed={collapsed}
        className={cn(
          "flex h-full min-w-0 flex-col overflow-hidden border-r border-border bg-sidebar",
          className,
        )}
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
                  active={href === activeHref}
                />
              );
            })}
          </nav>
        </ScrollArea>

        {(helpHref || onToggle) && (
          <div className="border-t border-border p-3">
            {helpHref && (
              <FooterLink
                href={helpHref}
                label={tHeader("help")}
                collapsed={collapsed}
              />
            )}
            {helpHref && onToggle && (
              <div
                data-testid="sidebar-footer-separator"
                className="my-2 h-px bg-border"
              />
            )}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-label={
                  collapsed ? t("expandSidebar") : t("collapseSidebar")
                }
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
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * Footer entry that leaves the app (currently only the user guide). Not a
 * `NavLink`: the target is an absolute external URL, so it is a plain anchor
 * (no locale/tenant prefixing) opened in a new tab. Collapsed → icon-only with
 * the same tooltip treatment as the nav items.
 */
function FooterLink({
  href,
  label,
  collapsed,
}: {
  href: string;
  label: string;
  collapsed: boolean;
}) {
  const link = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-[var(--edu-radius-btn)] py-2 text-sm font-medium transition-colors",
        // 44px touch target on mobile (A11Y-002, repo idiom).
        "max-[820px]:min-h-11",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed ? "justify-center px-0" : "px-3",
      )}
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </a>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
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
        // 44px touch target on mobile (A11Y-002, repo idiom).
        "max-[820px]:min-h-11",
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
