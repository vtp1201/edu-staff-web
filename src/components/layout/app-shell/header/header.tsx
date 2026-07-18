"use client";

import {
  ArrowLeftRight,
  Bell,
  LogOut,
  Menu,
  Search,
  Sun,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StatusBadge } from "@/components/shared/status-badge";
import type { StatusTone } from "@/components/shared/status-badge/status-badge";
import {
  type SwitchTenantResult,
  type TenantCardViewModel,
  TenantLogo,
  TenantSwitchDialog,
} from "@/components/shared/tenant-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Role } from "../sidebar/nav-config";
import { deriveTenantMenu } from "./derive-tenant-menu";
import { RoleSwitcher } from "./role-switcher";

/** Role → semantic badge tone (design-system.md "Role → màu"). */
const ROLE_TONE: Record<Role, StatusTone> = {
  teacher: "primary",
  principal: "success",
  student: "warning",
  parent: "purple",
  admin: "primary",
};

/**
 * Notification dot. DR-009 US-E16.2: error-ramp contrast — the bell badge dot
 * uses `bg-edu-error-dark` (#b91c1c, AA on white) instead of the lighter
 * `bg-edu-error` hue which fails small-target contrast.
 */
export const NOTIFICATION_DOT_CLASS =
  "absolute top-2 right-2 size-2 rounded-full bg-edu-error-dark";

type HeaderProps = {
  role: Role;
  userName?: string;
  onMenuClick?: () => void;
  onRoleChange?: (role: Role) => void;
  // NEW (US-E23.1) — all optional, default to "feature absent" so existing
  // stories/tests that don't pass them keep compiling/passing unchanged.
  /** Caller's enriched tenant memberships (RSC-fetched, fail-closed []). */
  memberships?: TenantCardViewModel[];
  /** Current-session tenantId (decoded from the access-token claim). */
  currentTenantId?: string;
  /** `switchTenantAction` server-action-as-prop (Path A). */
  onSwitchTenant?: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
};

export function Header({
  role,
  userName = "User",
  onMenuClick,
  onRoleChange,
  memberships = [],
  currentTenantId,
  onSwitchTenant,
}: HeaderProps) {
  const t = useTranslations("shell.header");
  const tSwitch = useTranslations("tenant.switch");
  const tRoles = useTranslations("shell.roles");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Zero-noise gate (FR-001/002) + current-tenant match (FR-007) — pure
  // derivation, unit-tested in derive-tenant-menu.test.ts.
  const { canSwitch, currentMembership } = deriveTenantMenu(
    memberships,
    currentTenantId,
    onSwitchTenant !== undefined,
  );

  /**
   * Open the "Chọn trường" dialog from the user-menu item without a keyboard
   * trap (US-E23.1 A11Y-001). Radix keeps `DropdownMenuContent` mounted through
   * its close animation (Presence); while it is mounted, the menu's dismissable
   * layer swallows the Escape meant for the Dialog — the menu and dialog resolve
   * to SEPARATE `@radix-ui/react-dismissable-layer` module copies, so they don't
   * share a layer stack and the closing menu always "wins" Escape in its own
   * context. So: close the (controlled) menu, then open the dialog only once the
   * menu content has fully unmounted — checked per animation frame (bounded, so
   * the dialog always opens even if the node lingers). This also lets focus land
   * inside the dialog instead of snapping back to the trigger. Focus RETURN on
   * close is handled by the dialog's explicit `onCloseAutoFocus` (below) focusing
   * `menuTriggerRef` — the shared Dialog's auto-capture snapshots `<body>` here
   * because the unmounting dropdown's focus-scope resets focus in the same tick.
   */
  function openSwitchDialog() {
    setMenuOpen(false);
    let frames = 0;
    const openWhenMenuGone = () => {
      const menuGone = !document.querySelector(
        '[data-slot="dropdown-menu-content"]',
      );
      if (menuGone || frames++ > 30) {
        setDialogOpen(true);
      } else {
        requestAnimationFrame(openWhenMenuGone);
      }
    };
    requestAnimationFrame(openWhenMenuGone);
  }

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 sm:px-6"
      style={{ height: "var(--edu-header-height, 64px)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t("toggleNav")}
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {mounted ? (
          <>
            <RoleSwitcher currentRole={role} onChange={onRoleChange} />

            <Button
              variant="ghost"
              size="icon"
              aria-label={t("notifications")}
              className="relative"
            >
              <Bell className="size-5" />
              <span className={NOTIFICATION_DOT_CLASS} />
            </Button>

            <ThemeToggle />

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={menuTriggerRef}
                  variant="ghost"
                  className="size-9 rounded-full p-0"
                  aria-label={t("userMenu")}
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{userName}</div>
                </div>
                {currentMembership && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <TenantLogo
                        size={36}
                        tenantName={currentMembership.tenantName}
                        accentTone={currentMembership.logoColor}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-sm text-foreground">
                          {currentMembership.tenantName}
                        </div>
                        <StatusBadge tone={ROLE_TONE[role]}>
                          {tRoles(role)}
                        </StatusBadge>
                      </div>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                {canSwitch && (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      // preventDefault so Radix's own select-close doesn't fight
                      // openSwitchDialog over focus/dismiss; openSwitchDialog
                      // then closes the menu and opens the dialog after the menu
                      // unmounts (see its doc — avoids the Escape keyboard trap).
                      event.preventDefault();
                      openSwitchDialog();
                    }}
                  >
                    <ArrowLeftRight
                      className="mr-2 size-4"
                      aria-hidden="true"
                    />
                    {tSwitch("menuItem")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  {t("profile")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sibling to the DropdownMenu (not nested, Risk B) — controlled
                dialog; the shared Dialog primitive restores focus to the
                user-menu trigger on close. */}
            {canSwitch && onSwitchTenant && (
              <TenantSwitchDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                memberships={memberships}
                onSwitchTenant={onSwitchTenant}
                onCloseAutoFocus={(event) => {
                  // Return focus to the user-menu trigger on close (WCAG 2.4.3).
                  // Explicit (not the Dialog's auto-capture) because the dialog
                  // was opened after the dropdown unmounted — see openSwitchDialog.
                  event.preventDefault();
                  menuTriggerRef.current?.focus();
                }}
              />
            )}
          </>
        ) : (
          <HeaderPlaceholder initials={initials} />
        )}
      </div>
    </header>
  );
}

function HeaderPlaceholder({ initials }: { initials: string }) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        aria-hidden
        tabIndex={-1}
      >
        <span className="size-2 rounded-full bg-muted" />
        <span className="hidden sm:inline">···</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-hidden
        tabIndex={-1}
        className="relative"
      >
        <Bell className="size-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-hidden tabIndex={-1}>
        <Sun className="size-5" />
      </Button>
      <Button
        variant="ghost"
        className="size-9 rounded-full p-0"
        aria-hidden
        tabIndex={-1}
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Button>
    </>
  );
}
