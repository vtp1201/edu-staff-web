/**
 * US-E23.1 — `switchTenantAction` Path A contract (fe-lead decision 2026-07-18).
 * Success path `redirect()`s (throws NEXT_REDIRECT) and that throw is
 * propagated UNCHANGED — never converted to a `{ ok:false }` result (Risk A).
 * The `useCase.execute()` failure path is mapped to a stable discriminated
 * result (`{ ok:false, errorKey }`).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const setAuthCookiesMock = vi.fn().mockResolvedValue(undefined);
const redirectMock = vi.fn();

vi.mock("@/bootstrap/di/tenant.di", () => ({
  makeSwitchTenantUseCase: vi.fn(async () => ({ execute: executeMock })),
}));
vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  setAuthCookies: setAuthCookiesMock,
}));
vi.mock("@/bootstrap/i18n/routing", () => ({
  redirect: redirectMock,
}));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));
vi.mock("@/features/tenant/infrastructure/mocks/tenant-display.mock", () => ({
  resolveTenantDisplay: vi.fn(() => ({
    tenantName: "THPT Chu Văn An",
    address: "x",
    logoColor: "primary",
  })),
}));

function nextRedirectError(): Error & { digest: string } {
  const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
  e.digest = "NEXT_REDIRECT;replace;/vi/t/tenant-x/teacher;307;";
  return e;
}

async function importAction() {
  const mod = await import("./actions");
  return mod.switchTenantAction;
}

describe("switchTenantAction (Path A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("on success sets cookies and redirects, appending ?switched=1&school=…", async () => {
    executeMock.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    });
    redirectMock.mockImplementation(() => {
      throw nextRedirectError();
    });
    const switchTenantAction = await importAction();

    await expect(
      switchTenantAction("tenant-x", "teacher"),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(setAuthCookiesMock).toHaveBeenCalledOnce();
    const href = redirectMock.mock.calls[0][0].href as string;
    expect(href).toContain("/t/tenant-x/teacher");
    expect(href).toContain("switched=1");
    expect(href).toContain(`school=${encodeURIComponent("THPT Chu Văn An")}`);
  });

  it("returns { ok:false, errorKey:'forbidden' } on a forbidden failure — no cookie, no redirect", async () => {
    executeMock.mockRejectedValue({ type: "forbidden" });
    const switchTenantAction = await importAction();

    await expect(switchTenantAction("tenant-x", "teacher")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns { ok:false, errorKey:'network' } on a network failure", async () => {
    executeMock.mockRejectedValue({ type: "network" });
    const switchTenantAction = await importAction();

    await expect(switchTenantAction("tenant-x", "teacher")).resolves.toEqual({
      ok: false,
      errorKey: "network",
    });
  });

  it("folds an unknown failure into the generic network errorKey", async () => {
    executeMock.mockRejectedValue({ type: "unknown" });
    const switchTenantAction = await importAction();

    await expect(switchTenantAction("tenant-x", "teacher")).resolves.toEqual({
      ok: false,
      errorKey: "network",
    });
  });

  it("does not append a role segment when role is empty", async () => {
    executeMock.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    });
    redirectMock.mockImplementation(() => {
      throw nextRedirectError();
    });
    const switchTenantAction = await importAction();

    await expect(switchTenantAction("tenant-x", "")).rejects.toBeDefined();
    const href = redirectMock.mock.calls[0][0].href as string;
    expect(href).toContain("/t/tenant-x?switched=1");
  });
});
