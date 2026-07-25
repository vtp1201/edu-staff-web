import { describe, expect, it } from "vitest";
import { resolveStudentAbsenceAuthContext } from "./resolve-student-absence-auth-context";

const base = {
  useMock: false,
  claimHomeroomClassId: null,
  mockRoleHint: "teacher" as const,
  mockMemberId: "teacher-1",
  mockClassId: "11B2",
};

/**
 * NFR-008 — the server-derived auth context. Mirrors
 * `resolve-staff-discipline-auth-context.test.ts`, PLUS this story's new
 * `classId` dimension (plan.md §8 risk #8): an unresolvable homeroom must
 * deny-by-default, which it does structurally by resolving to `""` (a value no
 * real `classId` can equal, so every ownership check fails).
 */
describe("resolveStudentAbsenceAuthContext", () => {
  it("uses the token claim in real mode and IGNORES the mock role hint", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      claimRole: "principal",
      claimMemberId: "m-9",
      mockRoleHint: "teacher",
    });
    expect(ctx.role).toBe("principal");
    expect(ctx.memberId).toBe("m-9");
  });

  it("denies by default when the role claim is unreadable (never principal, never teacher)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      claimRole: null,
      claimMemberId: null,
    });
    expect(ctx.role).not.toBe("principal");
    expect(ctx.role).not.toBe("teacher");
    expect(ctx.memberId).toBe("");
  });

  it("deny-by-default on the NEW classId dimension: no homeroom claim ⇒ empty classId (risk #8)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      claimRole: "teacher",
      claimMemberId: "m-9",
      claimHomeroomClassId: null,
    });
    // A teacher whose homeroom cannot be resolved gets "" — which can never
    // equal a real classId, so every record/edit ownership check fails closed.
    expect(ctx.classId).toBe("");
  });

  it("never borrows the MOCK classId in real mode (mock hint is not an auth input)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      claimRole: "teacher",
      claimMemberId: "m-9",
      claimHomeroomClassId: null,
      mockClassId: "11B2",
    });
    expect(ctx.classId).not.toBe("11B2");
  });

  it("uses a real homeroom claim when one is present (forward-compatible)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      claimRole: "teacher",
      claimMemberId: "m-9",
      claimHomeroomClassId: "class-uuid-1",
    });
    expect(ctx.classId).toBe("class-uuid-1");
  });

  it("uses the route-scoped hint only in mock mode (synthetic 'admin' claim)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      useMock: true,
      claimRole: "admin",
      claimMemberId: "ignored",
      mockRoleHint: "teacher",
    });
    expect(ctx.role).toBe("teacher");
    expect(ctx.memberId).toBe("teacher-1");
    expect(ctx.classId).toBe("11B2");
  });

  it("gives a mock-mode principal NO homeroom class (flag-only actor, never own-class scoped)", () => {
    const ctx = resolveStudentAbsenceAuthContext({
      ...base,
      useMock: true,
      claimRole: "admin",
      claimMemberId: "ignored",
      mockRoleHint: "principal",
      mockMemberId: "admin-1",
    });
    expect(ctx.role).toBe("principal");
    expect(ctx.memberId).toBe("admin-1");
    expect(ctx.classId).toBe("");
  });
});
