import { describe, expect, it } from "vitest";
import {
  canDecideLeave,
  type LeaveDecisionAuthContext,
} from "./leave-decision-auth-context.entity";

function ctx(
  over: Partial<LeaveDecisionAuthContext> = {},
): LeaveDecisionAuthContext {
  return { role: "teacher", homeroomClassIds: ["cls-10a1"], ...over };
}

/**
 * The decision-0063 proof point, isolated as a pure predicate: only the CURRENT
 * homeroom teacher (GVCN) of the class may decide one of its leave requests —
 * the same rule core enforces (`403 LEAVE_REQUEST_FORBIDDEN`), re-checked
 * before any HTTP call so a forged role can never reach the wire.
 */
describe("canDecideLeave", () => {
  it("allows a teacher who is the GVCN of that class", () => {
    expect(canDecideLeave(ctx(), "cls-10a1")).toBe(true);
  });

  it("denies a teacher for a class they do NOT homeroom", () => {
    expect(canDecideLeave(ctx(), "cls-11b2")).toBe(false);
  });

  it("denies a teacher with no homeroom class at all", () => {
    expect(canDecideLeave(ctx({ homeroomClassIds: [] }), "cls-10a1")).toBe(
      false,
    );
  });

  it("denies every non-teacher role even when the class id matches (BGH have read-only oversight — ADR 0073 Follow-Up)", () => {
    for (const role of ["principal", "admin", "student", "parent", ""]) {
      expect(canDecideLeave(ctx({ role }), "cls-10a1")).toBe(false);
    }
  });

  it("denies an empty class id rather than matching an empty scope entry", () => {
    expect(canDecideLeave(ctx({ homeroomClassIds: [""] }), "")).toBe(false);
  });
});
