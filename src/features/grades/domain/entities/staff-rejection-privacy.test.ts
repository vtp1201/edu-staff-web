import { describe, expect, expectTypeOf, it } from "vitest";
import type { GradeBookRow } from "./grade-book.entity";
import type {
  GradeCell,
  StaffGradeCell,
  StudentScoreRow,
} from "./grade-sheet.entity";

/**
 * US-E18.44 SECURITY/PRIVACY BOUNDARY — structural proof, not a convention.
 *
 * BE strips `rejectionReason`/`rejectedBy`/`rejectedAt` on every STUDENT/PARENT
 * read (`GET /members/{id}/grades`, `.../grade-report`). Web mirrors that as a
 * TYPE-level guarantee: the rejection payload lives ONLY on
 * {@link StaffGradeCell} (teacher/admin ENTRY path, `GradeSheet`), never on the
 * plain {@link GradeCell} that the multi-role READ path (`GradeBook`, which
 * serves `getMyGrades`/`getChildGrades`) is built from. A student/parent screen
 * therefore cannot render the field even by accident — there is nothing to
 * read, so it is a compile error rather than a blank/undefined leak.
 *
 * If a future change widens `GradeCell` (or `GradeBookRow.scores`) with the
 * rejection payload, the `@ts-expect-error` assertions below start failing
 * (unused directive) and `bunx tsc --noEmit` breaks the build.
 */
describe("staff-only rejection fields — structural absence on the student/parent read path", () => {
  it("GradeCell (read path) has NO rejection member", () => {
    const cell: GradeCell = { value: 9, status: "DRAFT" };
    // @ts-expect-error — `rejection` must not exist on the read-path cell type.
    const leak = cell.rejection;
    expect(leak).toBeUndefined();
  });

  it("GradeBookRow.scores cells (student self / parent-linked view) have NO rejection member", () => {
    const row: GradeBookRow = {
      studentId: "s1",
      studentName: "s1",
      studentCode: "s1",
      scores: { ck: { value: 9, status: "DRAFT" } },
      average: 9,
      conductGrade: "TB",
    };
    // @ts-expect-error — the student/parent view cannot even TYPE the field.
    const leak = row.scores.ck.rejection;
    expect(leak).toBeUndefined();
  });

  it("StaffGradeCell (teacher/admin entry path) is the ONLY carrier", () => {
    const cell: StaffGradeCell = {
      value: 9,
      status: "DRAFT",
      rejection: {
        reason: "Sai điểm",
        rejectedBy: "admin-1",
        rejectedAt: "2026-08-05T00:00:00Z",
      },
    };
    expect(cell.rejection?.reason).toBe("Sai điểm");
    expectTypeOf<
      StudentScoreRow["scores"]["x"]
    >().toEqualTypeOf<StaffGradeCell>();
  });

  it("a StaffGradeCell is still assignable where a read-path GradeCell is expected (widening, not forking)", () => {
    const staff: StaffGradeCell = { value: 8, status: "PUBLISHED" };
    const read: GradeCell = staff;
    expect(read.status).toBe("PUBLISHED");
  });

  it("absence is absence — a cell that was never rejected has no rejection key at all", () => {
    const cell: StaffGradeCell = { value: 8, status: "DRAFT" };
    expect(Object.keys(cell)).toEqual(["value", "status"]);
    expect("rejection" in cell).toBe(false);
  });
});
