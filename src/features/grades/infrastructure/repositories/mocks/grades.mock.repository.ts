import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type {
  GradeSheet,
  StudentScoreRow,
} from "../../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../../domain/failures/grades.failure";
import type { IGradesRepository } from "../../../domain/repositories/i-grades.repository";
import { mapStudentScoreRow } from "../../mappers/grades.mapper";
import { MOCK_ROWS, MOCK_SCHEME, MOCK_TERM } from "./fixtures";

// Module-level mutable in-memory state (reset on each `new` for determinism).
let _rows: StudentScoreRow[] = MOCK_ROWS.map((r) =>
  mapStudentScoreRow(r, MOCK_SCHEME),
);

export class MockGradesRepository implements IGradesRepository {
  /**
   * publishMode is injected so the DI factory can wire the REAL operational
   * setting (gradePublishMode) into the otherwise-mocked grade sheet.
   */
  constructor(private readonly publishMode: GradePublishMode = "SELF_PUBLISH") {
    _rows = MOCK_ROWS.map((r) => mapStudentScoreRow(r, MOCK_SCHEME));
  }

  async getGradeSheet(csId: string, term: string): Promise<GradeSheet> {
    await mockDelay();
    return {
      classSubjectId: csId,
      term,
      scheme: structuredClone(MOCK_SCHEME),
      rows: structuredClone(_rows),
      publishMode: this.publishMode,
    };
  }

  async saveScore(
    _csId: string,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<StudentScoreRow> {
    await mockDelay();
    const row = _rows.find((r) => r.studentId === studentId);
    if (!row) {
      const failure: GradesFailure = { type: "not-found" };
      throw failure;
    }
    if (row.publishStatus === "PUBLISHED") {
      const failure: GradesFailure = { type: "already-published" };
      throw failure;
    }
    row.scores = { ...row.scores, [columnId]: value };
    row.average = mapStudentScoreRow(
      {
        studentId: row.studentId,
        studentName: row.studentName,
        studentCode: row.studentCode,
        scores: row.scores,
        average: null,
        publishStatus: row.publishStatus,
      },
      MOCK_SCHEME,
    ).average;
    return structuredClone(row);
  }

  async publishGrades(_csId: string, _term: string): Promise<void> {
    await mockDelay();
    const nextStatus =
      this.publishMode === "ADMIN_APPROVAL" ? "PENDING_APPROVAL" : "PUBLISHED";
    for (const row of _rows) {
      row.publishStatus = nextStatus;
    }
  }
}

export const __MOCK_TERM = MOCK_TERM;
