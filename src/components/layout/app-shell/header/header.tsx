"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/bootstrap/i18n/routing";
import { tenantUrl } from "@/bootstrap/tenant";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  NotificationFilter,
  NotificationPage,
} from "@/features/notification/domain/entities/notification.entity";
import { NotificationDropdown } from "@/features/notification/presentation/notification-dropdown/notification-dropdown";
import {
  notificationKeys,
  type UnreadCountCache,
} from "@/features/notification/presentation/notification-keys";
import type { Role } from "../sidebar/nav-config";
import { deriveTenantMenu } from "./derive-tenant-menu";
import { LanguageSwitcher } from "./language-switcher";
import { NOTIFICATION_BADGE_CLASS } from "./notification-badge";

/** Role → semantic badge tone (design-system.md "Role → màu"). */
const ROLE_TONE: Record<Role, StatusTone> = {
  teacher: "primary",
  principal: "success",
  student: "warning",
  parent: "purple",
  admin: "primary",
};

/** Unread pill on the bell — hidden at 0 (no fake "you have mail" dot). */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden="true" className={NOTIFICATION_BADGE_CLASS}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * The pre-US-E24.13 bell: a link to the notifications centre (or, with no
 * tenant, a non-navigating icon). Still the ONLY bell below 640px — the
 * dropdown panel is a desktop affordance (design v3 draws it at 360px wide,
 * which would overflow a 375px screen), so mobile keeps navigating to the
 * full-page centre.
 */
function BellLinkButton({
  tenantId,
  label,
  count,
}: {
  tenantId?: string;
  label: string;
  count: number;
}) {
  return (
    <Button
      asChild={tenantId !== undefined}
      variant="ghost"
      size="icon"
      aria-label={label}
      className="relative"
    >
      {tenantId !== undefined ? (
        <Link href={tenantUrl(tenantId, "/notifications")}>
          <Bell className="size-5" />
          <UnreadBadge count={count} />
        </Link>
      ) : (
        <>
          <Bell className="size-5" />
          <UnreadBadge count={count} />
        </>
      )}
    </Button>
  );
}

type HeaderProps = {
  role: Role;
  userName?: string;
  onMenuClick?: () => void;
  /** Active tenant — makes the bell link to the notifications centre. */
  tenantId?: string;
  /** Server Action: revoke the session + clear cookies, then redirect. */
  onLogout?: () => Promise<void>;
  /**
   * Server Action: current unread-notification count. Shares the
   * `["notifications","unread-count"]` query key with the notifications centre,
   * so the realtime `notification.new` invalidation refreshes the badge too
   * (bootstrap/realtime/event-invalidation.ts).
   */
  onFetchUnreadCount?: () => Promise<{ count: number } | { errorKey: string }>;
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
  // NEW (US-E24.13) — the bell dropdown. All optional: without them the bell
  // keeps its pre-E24.13 "navigate to the centre" behaviour at EVERY viewport,
  // so existing callers/stories/tests are unaffected.
  /**
   * `fetchPageAction` passed straight through — the param shape is deliberately
   * identical (`{ filter, cursor? }`), because only a `"use server"` function
   * can cross the server→client prop boundary (a reshaping closure cannot).
   */
  onFetchNotificationsPreview?: (params: {
    filter: NotificationFilter;
    cursor?: string;
  }) => Promise<NotificationPage | { errorKey: string }>;
  /** `markReadAction` — one notification. */
  onMarkRead?: (id: string) => Promise<{ errorKey?: string }>;
  /** `markAllReadAction`. */
  onMarkAllRead?: () => Promise<{ errorKey?: string }>;
};

export function Header({
  role,
  userName = "User",
  onMenuClick,
  tenantId,
  onLogout,
  onFetchUnreadCount,
  memberships = [],
  currentTenantId,
  onSwitchTenant,
  onFetchNotificationsPreview,
  onMarkRead,
  onMarkAllRead,
}: HeaderProps) {
  const t = useTranslations("shell.header");
  const tNoti = useTranslations("notifications");
  const tSwitch = useTranslations("tenant.switch");
  const tRoles = useTranslations("shell.roles");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const bellPanelRef = useRef<HTMLDivElement>(null);
  // Theme lives in next-themes (class strategy + localStorage). `resolvedTheme`
  // (not `theme`) so the switch reflects the real applied theme when the user
  // is on "system".
  const { setTheme, resolvedTheme } = useTheme();
  useEffect(() => {
    setMounted(true);
  }, []);

  // Shares its cache entry with the notifications centre — so the cached value
  // MUST stay `{ count }` (the centre writes that shape on an SSE
  // notification.new). Unwrapped via `select`, never stored as a bare number.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<UnreadCountCache> => {
      const res = await onFetchUnreadCount?.();
      return { count: res && "count" in res ? res.count : 0 };
    },
    select: (data: UnreadCountCache) => data.count,
    enabled: onFetchUnreadCount !== undefined,
  });

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

  const bellLabel =
    unreadCount > 0
      ? `${t("notifications")} — ${tNoti("unreadCountAriaLabel", { count: unreadCount })}`
      : t("notifications");

  // The panel needs the preview action, the mark-read action (the row
  // interaction IS mark-read — AC-3) and a tenant (its footer link is
  // tenant-scoped); missing any → the plain link bell everywhere.
  const bellDropdownEnabled =
    onFetchNotificationsPreview !== undefined &&
    onMarkRead !== undefined &&
    tenantId !== undefined;

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
            {/* Viewport split (US-E24.13) — CSS only, the header's own idiom
                (cf. the `md:block` search field, the `lg:hidden` hamburger). A
                matchMedia hook would need its own mount guard to avoid a
                hydration mismatch; `hidden` is `display:none`, so the inactive
                trigger is out of the accessibility tree too, not merely
                invisible. */}
            <span className="sm:hidden">
              <BellLinkButton
                tenantId={tenantId}
                label={bellLabel}
                count={unreadCount}
              />
            </span>
            <span className="hidden sm:block">
              {bellDropdownEnabled ? (
                <Popover open={bellOpen} onOpenChange={setBellOpen}>
                  <PopoverTrigger asChild>
                    {/* A PLAIN button, never `asChild` a Link: opening the
                        panel navigates nowhere. */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={bellLabel}
                      className="relative"
                    >
                      <Bell className="size-5" />
                      <UnreadBadge count={unreadCount} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    ref={bellPanelRef}
                    align="end"
                    // Radix Content already carries role="dialog"; it just
                    // needs a name. Escape-close + focus-return to the trigger
                    // are the primitive's own defaults (unlike the tenant
                    // dialog, nothing unmounts underneath it first).
                    aria-label={tNoti("dropdownAriaLabel")}
                    className="w-90 overflow-hidden rounded-[14px] p-0"
                    onOpenAutoFocus={(event) => {
                      // AC: "Enter mở → focus vào tablist". Radix's FocusScope
                      // would otherwise take the first focusable descendant in
                      // DOM order, which is the "Đánh dấu tất cả đã đọc" button
                      // whenever there IS something unread — i.e. exactly the
                      // state the user opens the bell in (WCAG 2.4.3
                      // predictability).
                      event.preventDefault();
                      bellPanelRef.current
                        ?.querySelector<HTMLElement>('[role="tab"]')
                        ?.focus();
                    }}
                  >
                    <NotificationDropdown
                      tenantId={tenantId}
                      open={bellOpen}
                      unreadCount={unreadCount}
                      onFetchPreview={onFetchNotificationsPreview}
                      onMarkRead={onMarkRead}
                      onMarkAllRead={onMarkAllRead}
                      onClose={() => setBellOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <BellLinkButton
                  tenantId={tenantId}
                  label={bellLabel}
                  count={unreadCount}
                />
              )}
            </span>

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
                {/* Separator sits BELOW "Đổi trường" (design v3): the tenant
                    block + switch action are one group, the account actions
                    below are another. */}
                <DropdownMenuSeparator />
                {tenantId !== undefined ? (
                  <DropdownMenuItem asChild>
                    <Link href={tenantUrl(tenantId, "/profile")}>
                      <User className="mr-2 size-4" />
                      {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>
                    <User className="mr-2 size-4" />
                    {t("profile")}
                  </DropdownMenuItem>
                )}
                {/* Dark mode (US-E24.12) — replaces the standalone header icon.
                    `onSelect preventDefault` keeps the menu open so the user
                    sees the theme flip in place; Radix gives the row
                    `role="menuitemcheckbox"` + `aria-checked`. */}
                <DropdownMenuCheckboxItem
                  // Left-align the icon with the other rows and move the
                  // checked indicator to the trailing edge (design v3 puts the
                  // toggle on the right).
                  // `max-[820px]:min-h-11` → 44px touch target on mobile (repo idiom).
                  className="pl-2 max-[820px]:min-h-11 [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
                  checked={resolvedTheme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                  onSelect={(event) => event.preventDefault()}
                >
                  <Moon className="mr-2 size-4" aria-hidden="true" />
                  {t("darkMode")}
                </DropdownMenuCheckboxItem>
                <LanguageSwitcher />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    // Server Action: revokes the session, clears the httpOnly
                    // cookies and redirects to /login. Fire-and-forget — the
                    // redirect throw is handled inside the action.
                    void onLogout?.();
                  }}
                >
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
        variant="ghost"
        size="icon"
        aria-hidden
        tabIndex={-1}
        className="relative"
      >
        <Bell className="size-5" />
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
