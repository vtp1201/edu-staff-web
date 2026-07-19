/**
 * US-E23.2 — `page.tsx` four-way routing gate (RSC). Asserted by inspecting the
 * `screenState` prop of the returned `<SelectTenant>` element (the RSC returns a
 * React element without rendering it), plus the single-branch redirect path.
 *
 * Covers: AC-002.1/002.2 (single → skip via switchTenantAction + redirect,
 * component never reached), AC-004.1 (fetch-fail → error state, no throw
 * escapes), AC-001.2 (profile soft-failure → userName:null), AC-003.3 (0 ACTIVE
 * → empty), plus the mixed-status count and the sole-membership race fallback.
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { SelectTenantScreenState } from "./select-tenant.i-vm";

const listExecuteMock = vi.fn();
const profileExecuteMock = vi.fn();
const switchTenantActionMock = vi.fn();
const enrichMembershipsMock = vi.fn();

vi.mock("@/bootstrap/di/tenant.di", () => ({
  makeListMyMembershipsUseCase: vi.fn(async () => ({
    execute: listExecuteMock,
  })),
}));
vi.mock("@/bootstrap/di/auth.di", () => ({
  makeGetProfileUseCase: vi.fn(async () => ({ execute: profileExecuteMock })),
}));
vi.mock("./actions", () => ({
  switchTenantAction: switchTenantActionMock,
}));
vi.mock("@/features/tenant/infrastructure/enrich-memberships", () => ({
  enrichMemberships: enrichMembershipsMock,
}));
// `select-tenant.tsx` is a "use client" module pulling in next-intl/sonner —
// stub it to a plain identity so the RSC just returns an inspectable element.
vi.mock("./select-tenant", () => ({
  SelectTenant: (props: unknown) => props,
}));

function isRedirectError(): Error & { digest: string } {
  const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
  e.digest = "NEXT_REDIRECT;replace;/vi/t/tenant-1/teacher;307;";
  return e;
}

function m(overrides: Partial<TenantMembership> = {}): TenantMembership {
  return {
    tenantId: "t-1",
    roles: ["teacher"],
    status: "ACTIVE",
    ...overrides,
  };
}

async function runPage(): Promise<ReactElement> {
  const mod = await import("./page");
  return (await mod.default()) as unknown as ReactElement;
}

function screenStateOf(el: ReactElement): SelectTenantScreenState {
  return (el.props as { screenState: SelectTenantScreenState }).screenState;
}

describe("SelectTenantPage (routing gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enrichMembershipsMock.mockImplementation((items: TenantMembership[]) =>
      items.map((it) => ({
        ...it,
        tenantName: `Name ${it.tenantId}`,
        address: "addr",
        logoColor: "primary",
        isCurrent: false,
        isSwitchable: it.status === "ACTIVE",
      })),
    );
  });

  it("AC-004.1: fetch failure → error screenState, no throw escapes", async () => {
    listExecuteMock.mockRejectedValue(new Error("network"));

    const el = await runPage();

    expect(screenStateOf(el)).toEqual({ kind: "error" });
    expect(switchTenantActionMock).not.toHaveBeenCalled();
  });

  it("AC-002.1/002.2: exactly 1 ACTIVE → switchTenantAction + redirect, component never reached", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "sole", roles: ["principal"] }),
    ]);
    switchTenantActionMock.mockImplementation(() => {
      throw isRedirectError();
    });

    await expect(runPage()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(switchTenantActionMock).toHaveBeenCalledWith("sole", "principal");
    // component never rendered → enrichMemberships never called on the skip path
    expect(enrichMembershipsMock).not.toHaveBeenCalled();
  });

  it("single-membership race: switchTenantAction returns { ok:false } → error state (no third copy)", async () => {
    listExecuteMock.mockResolvedValue([m({ tenantId: "sole" })]);
    switchTenantActionMock.mockResolvedValue({
      ok: false,
      errorKey: "forbidden",
    });

    const el = await runPage();

    expect(switchTenantActionMock).toHaveBeenCalledWith("sole", "teacher");
    expect(screenStateOf(el)).toEqual({ kind: "error" });
  });

  it("single branch counts only ACTIVE: 1 ACTIVE among non-ACTIVE still skips", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "active", status: "ACTIVE" }),
      m({ tenantId: "left", status: "LEFT" }),
    ]);
    switchTenantActionMock.mockImplementation(() => {
      throw isRedirectError();
    });

    await expect(runPage()).rejects.toBeDefined();
    expect(switchTenantActionMock).toHaveBeenCalledWith("active", "teacher");
  });

  it("AC-003.3: 0 ACTIVE (all non-ACTIVE) → empty screenState", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "t-1", status: "INACTIVE" }),
      m({ tenantId: "t-2", status: "SUSPENDED" }),
    ]);

    const el = await runPage();

    expect(screenStateOf(el)).toEqual({ kind: "empty" });
    expect(switchTenantActionMock).not.toHaveBeenCalled();
  });

  it("≥2 ACTIVE with profile → cards screenState with userName + count", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "t-1" }),
      m({ tenantId: "t-2" }),
    ]);
    profileExecuteMock.mockResolvedValue({ data: { name: "Cô Lan" } });

    const state = screenStateOf(await runPage());

    expect(state.kind).toBe("cards");
    if (state.kind !== "cards") throw new Error("unreachable");
    expect(state.userName).toBe("Cô Lan");
    expect(state.count).toBe(2);
    expect(state.cards).toHaveLength(2);
  });

  it("AC-001.2: profile fetch rejects → cards with userName:null (soft failure)", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "t-1" }),
      m({ tenantId: "t-2" }),
    ]);
    profileExecuteMock.mockRejectedValue(new Error("profile down"));

    const state = screenStateOf(await runPage());

    expect(state.kind).toBe("cards");
    if (state.kind !== "cards") throw new Error("unreachable");
    expect(state.userName).toBeNull();
    expect(state.count).toBe(2);
  });

  it("cards branch drops non-ACTIVE memberships (FR-003 one card per ACTIVE)", async () => {
    listExecuteMock.mockResolvedValue([
      m({ tenantId: "t-1", status: "ACTIVE" }),
      m({ tenantId: "t-2", status: "ACTIVE" }),
      m({ tenantId: "t-3", status: "INACTIVE" }),
    ]);
    profileExecuteMock.mockResolvedValue({ data: { name: "X" } });

    const state = screenStateOf(await runPage());
    if (state.kind !== "cards") throw new Error("unreachable");
    expect(state.count).toBe(2);
    // enrichMemberships received only the ACTIVE two
    expect(enrichMembershipsMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({ tenantId: "t-1" }),
        expect.objectContaining({ tenantId: "t-2" }),
      ],
      null,
    );
  });
});
