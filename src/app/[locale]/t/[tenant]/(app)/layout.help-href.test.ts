import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * US-E24.12 — proof that `(app)/layout.tsx` actually reads
 * `NEXT_PUBLIC_HELP_URL` and threads it into `<AppShell helpHref>`. This is
 * the ONLY call site that sets `helpHref` (the sidebar itself just renders
 * whatever it's given, already covered by `sidebar.stories.tsx`) — without
 * this test the env-var wiring in the RSC layout had zero proof (the packet's
 * own Plan §0 calls this file's 3-line change "the same shape as
 * NEXT_PUBLIC_USE_MOCK", but no test exercises it). Mirrors the
 * `principal/layout.test.ts` node-env RSC recipe: call the exported layout
 * function directly and inspect the returned element tree instead of
 * fully rendering it (AppShell is a client component; we never invoke its
 * body/hooks here, only read the props React.createElement captured).
 */

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: vi.fn(async () => "token"),
}));
vi.mock("@/bootstrap/lib/jwt", () => ({
  decodeRoleClaim: vi.fn(() => "teacher"),
  decodeTenantId: vi.fn(() => "acme"),
}));
vi.mock("@/bootstrap/di/auth.di", () => ({
  makeGetProfileUseCase: vi.fn(async () => ({
    execute: async () => ({
      data: { name: "Nguyen Van A", email: "a@x.com", emailVerified: true },
    }),
  })),
}));
vi.mock("@/bootstrap/di/tenant.di", () => ({
  makeListMyMembershipsUseCase: vi.fn(async () => ({
    execute: async () => [],
  })),
}));
vi.mock("@/features/tenant/infrastructure/enrich-memberships", () => ({
  enrichMemberships: vi.fn(() => []),
}));
vi.mock("@/app/[locale]/(auth)/login/actions", () => ({
  logoutAction: vi.fn(),
}));
vi.mock("@/app/[locale]/(auth)/select-tenant/actions", () => ({
  switchTenantAction: vi.fn(),
}));
vi.mock("./(shared)/notifications/actions", () => ({
  fetchUnreadCountAction: vi.fn(),
  // US-E24.13 — the bell dropdown's three action refs, threaded through
  // AppShell to the header.
  fetchPageAction: vi.fn(),
  markReadAction: vi.fn(),
  markAllReadAction: vi.fn(),
}));
vi.mock("./email-verification.actions", () => ({
  requestEmailVerificationAction: vi.fn(),
}));
// AppShell itself is a "use client" component that (transitively) imports
// next-intl's navigation() factory, which needs `next/navigation` — not
// resolvable in this node-env unit test and irrelevant to what we're
// proving (the RSC layout's prop-threading, not AppShell's own body/hooks —
// those are already covered by app-shell.test.tsx/stories). Mock it to a
// bare function so React.createElement still captures real props.
const MockAppShell = vi.fn(() => null);
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: MockAppShell,
}));

// AppShell is nested two levels under the layout's returned element
// (<ReactQueryProvider><AppShell .../></ReactQueryProvider>) — find it by
// walking `.props.children` instead of hardcoding a depth.
type AppShellProps = {
  helpHref?: string;
  onFetchNotificationsPreview?: unknown;
  onMarkRead?: unknown;
  onMarkAllRead?: unknown;
};

function findAppShellElement(node: unknown): { props: AppShellProps } {
  if (!node || typeof node !== "object") {
    throw new Error("AppShell element not found in the layout's output");
  }
  const el = node as {
    type?: unknown;
    props?: AppShellProps & { children?: unknown };
  };
  if (el.type === MockAppShell) {
    return el as { props: AppShellProps };
  }
  if (el.props?.children) {
    return findAppShellElement(el.props.children);
  }
  throw new Error("AppShell element not found in the layout's output");
}

async function renderLayout(tenant = "acme") {
  const { default: AppLayout } = await import("./layout");
  return AppLayout({
    children: null,
    params: Promise.resolve({ locale: "vi", tenant }),
  });
}

describe("(app)/layout.tsx — NEXT_PUBLIC_HELP_URL → AppShell.helpHref wiring", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("threads the env var value into AppShell when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    vi.stubEnv("NEXT_PUBLIC_HELP_URL", "https://help.eduportal.vn");
    const result = await renderLayout();
    const shell = findAppShellElement(result);
    expect(shell.props.helpHref).toBe("https://help.eduportal.vn");
  });

  it("passes undefined (no dead link) when the env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    delete process.env.NEXT_PUBLIC_HELP_URL;
    const result = await renderLayout();
    const shell = findAppShellElement(result);
    expect(shell.props.helpHref).toBeUndefined();
  });
});

/**
 * US-E24.13 — the bell dropdown's three Server Action refs must reach AppShell
 * as the SAME function objects the actions module exports. A convenience
 * wrapper (e.g. reshaping `{filter,cursor}` into `{filter,limit}`) would be a
 * plain closure, and a plain closure cannot cross the server→client boundary —
 * it fails at runtime, where neither tsc nor the build would catch it. Identity
 * (`toBe`) is therefore the assertion, not "is a function".
 */
describe("(app)/layout.tsx — bell dropdown Server Action refs (US-E24.13)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("passes fetchPage / markRead / markAllRead through unwrapped", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    const result = await renderLayout();
    // Imported AFTER the layout so both resolve to the same module instance.
    const actions = await import("./(shared)/notifications/actions");
    const shell = findAppShellElement(result);
    expect(shell.props.onFetchNotificationsPreview).toBe(
      actions.fetchPageAction,
    );
    expect(shell.props.onMarkRead).toBe(actions.markReadAction);
    expect(shell.props.onMarkAllRead).toBe(actions.markAllReadAction);
  });
});
