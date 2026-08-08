/**
 * Unit tests — viewer-role → empty-state copy selection (US-E18.57).
 *
 * BE's ADR-0136 grant made "teacher sees NOTHING" a `200 { records: [] }`
 * rather than a 403: a TEACHER reads only the classes they are the current
 * GVCN of, and zero overlap is a SUCCESS with an empty list. The generic
 * "chưa có học bạ nào" copy claims something false in that case (the student
 * very likely HAS records — the teacher just is not authorized to see any of
 * them), so the empty branch is role-aware.
 *
 * BE gives no signal separating "genuinely zero records" from "zero authorized
 * records" (both are `records: []`), so the teacher copy must be true under
 * BOTH readings — one message, no client-side probing.
 */
import { describe, expect, it } from "vitest";
import type { AcademicRecordViewerRole } from "./academic-record-screen.i-vm";
import { emptyStateCopyKey, roleBadgeKey } from "./academic-record-screen.i-vm";

describe("emptyStateCopyKey", () => {
  it("selects the homeroom-scoped copy for a TEACHER", () => {
    expect(emptyStateCopyKey("teacher")).toBe("empty.teacherNoHomeroomAccess");
  });

  it.each<AcademicRecordViewerRole>([
    "student",
    "parent",
    "admin",
  ])("keeps the generic empty copy for %s (their read is not homeroom-scoped)", (role) => {
    expect(emptyStateCopyKey(role)).toBe("empty");
  });
});

describe("roleBadgeKey", () => {
  it("uppercases the role into its badge key", () => {
    expect(roleBadgeKey("teacher")).toBe("TEACHER");
  });
});
