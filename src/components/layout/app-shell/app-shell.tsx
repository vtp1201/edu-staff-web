"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import { usePathname, useRouter } from "@/bootstrap/i18n/routing";
import { useRealtimeEvents } from "@/bootstrap/realtime";
import { tenantUrl } from "@/bootstrap/tenant";
import {
  SseDisconnectBanner,
  SsePendingPill,
} from "@/components/shared/sse-status";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "@/components/shared/tenant-card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EmailVerifyBanner } from "@/features/auth/presentation/email-verify/email-verify-banner";
import { EmailVerifyProvider } from "@/features/auth/presentation/email-verify/email-verify-context";
import { Header } from "./header/header";
import { parseSwitchedParam } from "./parse-switched-param";
import type { Role } from "./sidebar/nav-config";
import { Sidebar } from "./sidebar/sidebar";
import { useSidebarCollapsed } from "./sidebar/use-sidebar-collapsed";

type AppShellProps = {
  /** Active tenant (US-E05.1) — all workspace links are scoped under it. */
  tenantId: string;
  role: Role;
  userName?: string;
  /** Verification status — tri-state (`null` = unresolved/error → banner
   *  fail-closed) from the shell's `GET /users/me` (US-E22.1). */
  emailVerified?: boolean | null;
  /** Account email for the banner/dialog copy (US-E22.1). */
  email?: string;
  /** Send/resend email-verification server action (server-action-as-prop). */
  onRequestEmailVerification?: () => Promise<EmailVerificationActionResult>;
  // NEW (US-E23.1) — pass-through to <Header>; all optional (feature absent by
  // default) so existing callers/tests/stories keep working unchanged.
  memberships?: TenantCardViewModel[];
  currentTenantId?: string;
  onSwitchTenant?: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
  children: React.ReactNode;
};

export function AppShell({
  tenantId,
  role: initialRole,
  userName,
  emailVerified = null,
  email = "",
  onRequestEmailVerification,
  memberships,
  currentTenantId,
  onSwitchTenant,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tSwitch = useTranslations("tenant.switch");
  const [role, setRole] = useState<Role>(initialRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  // Tenant-switch success toast (US-E23.1, fe-lead decision 2026-07-18):
  // switchTenantAction redirect()s before returning, so the toast fires from
  // the destination via a one-shot `?switched=1&school=<name>` param, then the
  // param is stripped so a refresh doesn't re-fire it.
  const switchedFired = useRef(false);
  useEffect(() => {
    const school = parseSwitchedParam(searchParams);
    if (school === null || switchedFired.current) return;
    switchedFired.current = true;
    toast.success(tSwitch("switched", { school }));
    router.replace(pathname);
  }, [searchParams, pathname, router, tSwitch]);

  // Realtime (SSE) connection — mounted once for the whole shell (US-E08.6).
  // Also activates the dormant notification.created/attendance.updated cache
  // invalidation the hook has provided since US-E06.2 but was never mounted.
  const { sseStatus, showBanner, pendingMsgCount, reconnect } =
    useRealtimeEvents({ tenantId });
  // `showBanner` is only ever true for disconnected / post-disconnect
  // connecting; the `!== "connected"` guard narrows the type for the banner prop.
  const bannerStatus =
    showBanner && sseStatus !== "connected" ? sseStatus : undefined;

  // Switch workspace via client navigation — no full reload, scoped to the
  // current tenant (`/t/{tenantId}/{role}`); the layout re-renders the new nav.
  function handleRoleChange(next: Role) {
    if (next === role) return;
    setRole(next);
    setMobileOpen(false);
    router.push(tenantUrl(tenantId, `/${next}`));
  }

  return (
    <EmailVerifyProvider initialEmailVerified={emailVerified} email={email}>
      <div className="flex min-h-screen bg-background">
        <div className="hidden lg:block">
          <Sidebar
            tenantId={tenantId}
            role={role}
            collapsed={collapsed}
            onToggle={toggle}
          />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            <SheetTitle className="sr-only">EduPortal</SheetTitle>
            <Sidebar tenantId={tenantId} role={role} className="border-r-0" />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            role={role}
            userName={userName}
            onMenuClick={() => setMobileOpen(true)}
            onRoleChange={handleRoleChange}
            memberships={memberships}
            currentTenantId={currentTenantId}
            onSwitchTenant={onSwitchTenant}
          />
          <SseDisconnectBanner status={bannerStatus} onReconnect={reconnect} />
          <EmailVerifyBanner onSend={onRequestEmailVerification} />
          <main
            id="app-shell-main"
            tabIndex={-1}
            className="flex-1 p-4 outline-none sm:p-6"
          >
            {children}
          </main>
        </div>

        <SsePendingPill
          count={pendingMsgCount}
          visible={pendingMsgCount > 0 && !pathname.endsWith("/messages")}
          onClick={() => router.push(tenantUrl(tenantId, "/messages"))}
        />
      </div>
    </EmailVerifyProvider>
  );
}
