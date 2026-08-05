import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradeEntryStatus } from "./grade-entry-status.entity";

export type {
  AssessmentColumn,
  AssessmentScheme,
} from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
export type { GradeEntryStatus } from "./grade-entry-status.entity";

/**
 * A single student × column grade entry (US-E18.12, ADR 0054). Status is
 * PER-CELL — the real `GradeEntry` aggregate has no row-level or
 * class-subject-level status concept. `GradePublishStatus` (the old
 * row-level status) is retired entirely, not aliased.
 */
export interface GradeCell {
  value: number | null; // null = not yet entered
  status: GradeEntryStatus;
}

/**
 * The latest reject/request-revision cycle on ONE grade entry (US-E18.44, BE
 * US-184). Present ONLY when the entry has been rejected at least once, and
 * NOT cleared when the teacher resubmits — an approver keeps seeing the last
 * reason. `reason` is staff-entered FREE TEXT (≤500 chars): render it as a
 * plain JSX text node only (React escapes it); never via
 * `dangerouslySetInnerHTML`.
 *
 * The 3 wire fields are grouped into one optional object on purpose — they
 * always arrive together as one cycle, so a single presence check ("was this
 * rejected?") cannot be got partially wrong, and a `rejectedBy` without a
 * `reason` is not expressible.
 */
export interface GradeRejection {
  /** Staff-entered free text. Never empty — an absent reason means no rejection. */
  reason: string;
  /** Approver's memberId. ABSENT when the wire omits it — never defaulted. */
  rejectedBy?: string;
  /** ISO-8601. ABSENT when the wire omits it — never defaulted. */
  rejectedAt?: string;
}

/**
 * STAFF-ONLY cell shape (US-E18.44). Widens {@link GradeCell} with the
 * rejection payload `core` returns to TEACHER/ADMIN/MANAGER callers and
 * **strips entirely on STUDENT/PARENT reads**.
 *
 * The split is a SECURITY/PRIVACY boundary expressed in the type system, not a
 * convention: the multi-role read path (`GradeBook`/`GradeBookRow`, which
 * serves `getMyGrades`/`getChildGrades`) is built from plain `GradeCell`, so a
 * student/parent surface cannot render — or even reference — a rejection
 * reason. Proven in `staff-rejection-privacy.test.ts`. Do NOT widen
 * `GradeCell` itself and do NOT use `StaffGradeCell` in `grade-book.entity.ts`.
 */
export interface StaffGradeCell extends GradeCell {
  rejection?: GradeRejection;
}

export interface StudentScoreRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  /** key = AssessmentColumn.id — staff (teacher-entry) side, carries rejections */
  scores: Record<string, StaffGradeCell>;
  /** computed weighted average; null if any column value is missing */
  average: number | null;
}

export interface GradeSheet {
  classId: string;
  subjectId: string;
  termId: string;
  academicYearLabel: string;
  scheme: AssessmentScheme;
  rows: StudentScoreRow[];
  publishMode: GradePublishMode;
}
