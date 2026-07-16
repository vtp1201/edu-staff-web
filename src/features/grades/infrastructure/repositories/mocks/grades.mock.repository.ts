import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { ClassSubjectTermKey } from "../../../domain/entities/class-subject-term-key.entity";
import type {
  GradeCell,
  GradeSheet,
} from "../../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../../domain/failures/grades.failure";
import type { IGradesRepository } from "../../../domain/repositories/i-grades.repository";
import type { IGradesTermRepository } from "../../../domain/repositories/i-grades-term.repository";
import { calculateWeightedAverage } from "../../../domain/use-cases/calculate-weighted-average.use-case";
import { MOCK_ROWS, MOCK_SCHEME } from "./fixtures";

function cloneRows() {
  return structuredClone(MOCK_ROWS);
}

// Module-level mutable in-memory state (reset on each `new` for determinism).
let _rows = cloneRows();

/**
 * Mock-mode fallback (US-E18.12, ADR 0054) — simulates the real per-cell
 * `GradeEntry` contract: `saveScore` always resets a cell to DRAFT (real
 * `enterGrade` semantics), `submitScore` transitions ONE cell (no bulk),
 * `lockTerm` bulk-locks every PUBLISHED cell across the whole sheet.
 */
export class MockGradesRepository
  implements IGradesRepository, IGradesTermRepository
{
  constructor(private readonly publishMode: GradePublishMode = "SELF_PUBLISH") {
    _rows = cloneRows();
  }

  async getGradeSheet(key: ClassSubjectTermKey): Promise<GradeSheet> {
    await mockDelay();
    return {
      classId: key.classId,
      subjectId: key.subjectId,
      termId: key.termId,
      academicYearLabel: key.academicYearLabel,
      scheme: structuredClone(MOCK_SCHEME),
      rows: structuredClone(_rows),
      publishMode: this.publishMode,
    };
  }

  async saveScore(
    _key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }> {
    await mockDelay();
    const row = _rows.find((r) => r.studentId === studentId);
    if (!row) {
      const failure: GradesFailure = { type: "not-found" };
      throw failure;
    }
    const existing = row.scores[columnId];
    if (existing && existing.status !== "DRAFT" && existing.value !== null) {
      // Real `enterGrade`: 409 GRADE_ENTRY_NOT_DRAFT if an existing entry is
      // found and is NOT DRAFT.
      const failure: GradesFailure = { type: "not-draft" };
      throw failure;
    }
    const cell: GradeCell = { value, status: "DRAFT" };
    row.scores = { ...row.scores, [columnId]: cell };
    const values: Record<string, number | null> = {};
    for (const [colId, c] of Object.entries(row.scores))
      values[colId] = c.value;
    row.average = calculateWeightedAverage(values, MOCK_SCHEME.columns);
    return { studentId, columnId, cell: structuredClone(cell) };
  }

  async submitScore(
    _key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }> {
    await mockDelay();
    const row = _rows.find((r) => r.studentId === studentId);
    const current = row?.scores[columnId];
    if (!row || !current || current.value === null) {
      const failure: GradesFailure = { type: "not-found" };
      throw failure;
    }
    if (current.status !== "DRAFT") {
      const failure: GradesFailure = { type: "not-draft" };
      throw failure;
    }
    const nextStatus =
      this.publishMode === "ADMIN_APPROVAL" ? "PENDING_APPROVAL" : "PUBLISHED";
    const cell: GradeCell = { value: current.value, status: nextStatus };
    row.scores = { ...row.scores, [columnId]: cell };
    return { studentId, columnId, cell: structuredClone(cell) };
  }

  async lockTerm(_key: ClassSubjectTermKey): Promise<{ lockedCount: number }> {
    await mockDelay();
    let lockedCount = 0;
    for (const row of _rows) {
      for (const [colId, cell] of Object.entries(row.scores)) {
        if (cell.status === "PUBLISHED") {
          row.scores[colId] = { value: cell.value, status: "LOCKED" };
          lockedCount += 1;
        }
      }
    }
    return { lockedCount };
  }
}
