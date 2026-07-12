import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * US-E08.6 gap-fill: `AppShell` is the only place that computes the SSE pill's
 * `visible` boolean (pathname-gated) and wires `onClick` -> `router.push`, and
 * that derives the banner's `status` prop from the hook's `showBanner`/
 * `sseStatus`. Neither `SseDisconnectBanner` nor `SsePendingPill`'s own tests
 * exercise this wiring (they only ever receive pre-computed props). This file
 * closes that gap (AC-1/AC-7/AC-8/AC-9) without a browser/jsdom env: it mocks
 * every child module `AppShell` imports, renders via `react-dom/server`
 * (matches the repo's node-env, no-@testing-library convention — see
 * `destructive-confirm-dialog.test.tsx`), captures the props `AppShell` passes
 * to the two SSE leaf components, and invokes the captured `onClick`/
 * `onReconnect` callbacks directly as plain function calls (not a DOM click,
 * which is unavailable in this env) to prove the navigation/reconnect wiring.
 */

const pushMock = vi.fn();
let mockPathname = "/t/school-a/teacher/dashboard";

vi.mock("@/bootstrap/i18n/routing", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock }),
}));

let mockRealtime: {
  sseStatus: "connected" | "connecting" | "disconnected";
  showBanner: boolean;
  pendingMsgCount: number;
  reconnect: ReturnType<typeof vi.fn>;
} = {
  sseStatus: "connecting",
  showBanner: false,
  pendingMsgCount: 0,
  reconnect: vi.fn(),
};

vi.mock("@/bootstrap/realtime", () => ({
  useRealtimeEvents: () => mockRealtime,
}));

type CapturedBannerProps = {
  status?: "connecting" | "disconnected";
  onReconnect: () => void;
};
type CapturedPillProps = {
  count: number;
  visible: boolean;
  onClick: () => void;
};

const bannerCalls: CapturedBannerProps[] = [];
const pillCalls: CapturedPillProps[] = [];

vi.mock("@/components/shared/sse-status", () => ({
  SseDisconnectBanner: (props: CapturedBannerProps) => {
    bannerCalls.push(props);
    return null;
  },
  SsePendingPill: (props: CapturedPillProps) => {
    pillCalls.push(props);
    return null;
  },
}));

vi.mock("./header/header", () => ({
  Header: () => null,
}));
vi.mock("./sidebar/sidebar", () => ({
  Sidebar: () => null,
}));
vi.mock("./sidebar/use-sidebar-collapsed", () => ({
  useSidebarCollapsed: () => ({ collapsed: false, toggle: vi.fn() }),
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: () => null,
  SheetContent: () => null,
  SheetTitle: () => null,
}));
// EmailVerifyBanner/Provider (US-E22.1) have their own tests/stories; stub them
// here so this SSE-wiring test needs no i18n/context setup.
vi.mock(
  "@/features/auth/presentation/email-verify/email-verify-banner",
  () => ({
    EmailVerifyBanner: () => null,
  }),
);
vi.mock(
  "@/features/auth/presentation/email-verify/email-verify-context",
  () => ({
    EmailVerifyProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  }),
);

async function renderShell(overrides: Partial<typeof mockRealtime> = {}) {
  mockRealtime = { ...mockRealtime, ...overrides };
  const { AppShell } = await import("./app-shell");
  // Spread props so Biome's useValidAriaRole doesn't read AppShell's `role`
  // (workspace role, not an ARIA role) as a JSX ARIA role attribute.
  const props = { tenantId: "school-a", role: "teacher" as const };
  renderToStaticMarkup(
    <AppShell {...props}>
      <div>content</div>
    </AppShell>,
  );
}

describe("AppShell — SSE wiring (US-E08.6)", () => {
  beforeEach(() => {
    vi.resetModules();
    bannerCalls.length = 0;
    pillCalls.length = 0;
    pushMock.mockClear();
    mockPathname = "/t/school-a/teacher/dashboard";
    mockRealtime = {
      sseStatus: "connecting",
      showBanner: false,
      pendingMsgCount: 0,
      reconnect: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes status=undefined to the banner on first-connect (AC-1: showBanner=false)", async () => {
    await renderShell({ sseStatus: "connecting", showBanner: false });
    expect(bannerCalls).toHaveLength(1);
    expect(bannerCalls[0].status).toBeUndefined();
  });

  it("passes status='disconnected' through when showBanner is true (AC-2)", async () => {
    await renderShell({ sseStatus: "disconnected", showBanner: true });
    expect(bannerCalls[0].status).toBe("disconnected");
  });

  it("passes status='connecting' through on a post-disconnect reconnect (AC-3)", async () => {
    await renderShell({ sseStatus: "connecting", showBanner: true });
    expect(bannerCalls[0].status).toBe("connecting");
  });

  it("narrows status to undefined once reconnected, even if showBanner lags true for one tick (AC-4)", async () => {
    // Defensive case: the hook always flips showBanner false alongside
    // 'connected' (per sse-connection.ts), but AppShell's own `!== "connected"`
    // guard is what actually prevents ever passing status="connected" through
    // (SseDisconnectBannerProps#status only accepts "connecting"|"disconnected").
    await renderShell({ sseStatus: "connected", showBanner: true });
    expect(bannerCalls[0].status).toBeUndefined();
  });

  it("wires the hook's reconnect() straight through as onReconnect", async () => {
    const reconnect = vi.fn();
    await renderShell({ reconnect });
    bannerCalls[0].onReconnect();
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("computes pill visible=true when pendingMsgCount>0 and NOT on /messages (AC-7)", async () => {
    mockPathname = "/t/school-a/teacher/dashboard";
    await renderShell({ pendingMsgCount: 3 });
    expect(pillCalls[0]).toMatchObject({ count: 3, visible: true });
  });

  it("computes pill visible=false when pendingMsgCount is 0, even off /messages", async () => {
    mockPathname = "/t/school-a/teacher/dashboard";
    await renderShell({ pendingMsgCount: 0 });
    expect(pillCalls[0].visible).toBe(false);
  });

  it("computes pill visible=false while the user is on /messages, regardless of count (AC-9)", async () => {
    mockPathname = "/t/school-a/messages";
    await renderShell({ pendingMsgCount: 5 });
    expect(pillCalls[0]).toMatchObject({ count: 5, visible: false });
  });

  it("pill onClick navigates to the tenant-scoped /messages route (AC-8)", async () => {
    mockPathname = "/t/school-a/teacher/dashboard";
    await renderShell({ pendingMsgCount: 2 });
    pillCalls[0].onClick();
    expect(pushMock).toHaveBeenCalledExactlyOnceWith("/t/school-a/messages");
  });
});
