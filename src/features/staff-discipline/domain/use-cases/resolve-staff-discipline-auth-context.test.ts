import { describe, expect, it } from "vitest";
import { resolveStaffDisciplineAuthContext } from "./resolve-staff-discipline-auth-context";

const base = {
  useMock: false,
  mockRoleHint: "principal" as const,
  mockMemberId: "admin-1",
  mockStaffMemberId: "staff-1",
};

describe("resolveStaffDisciplineAuthContext", () => {
  it("uses the token claim in real mode and IGNORES the mock role hint (NFR-008)", () => {
    const ctx = resolveStaffDisciplineAuthContext({
      ...base,
      claimRole: "teacher",
      claimMemberId: "m-9",
    });
    expect(ctx.role).toBe("teacher");
    expect(ctx.memberId).toBe("m-9");
  });

  it("denies by default when the role claim is unreadable (never principal)", () => {
    const ctx = resolveStaffDisciplineAuthContext({
      ...base,
      claimRole: null,
      claimMemberId: null,
    });
    expect(ctx.role).not.toBe("principal");
    expect(ctx.memberId).toBe("");
  });

  it("uses the route-scoped hint only in mock mode (synthetic 'admin' claim)", () => {
    const ctx = resolveStaffDisciplineAuthContext({
      ...base,
      useMock: true,
      claimRole: "admin",
      claimMemberId: "ignored",
      mockRoleHint: "teacher",
    });
    expect(ctx.role).toBe("teacher");
    expect(ctx.memberId).toBe("admin-1");
    expect(ctx.staffMemberId).toBe("staff-1");
  });
});
