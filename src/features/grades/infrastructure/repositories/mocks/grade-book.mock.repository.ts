import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { ClassSubjectTermKey } from "../../../domain/entities/class-subject-term-key.entity";
import type {
  ChildSummary,
  GradeBook,
  GradeBookRow,
} from "../../../domain/entities/grade-book.entity";
import type { IGradeBookRepository } from "../../../domain/repositories/i-grade-book.repository";
import { MOCK_SCHEME } from "./fixtures";
import {
  MOCK_GRADE_BOOK_CLASS_ID,
  MOCK_GRADE_BOOK_CLASS_NAME,
  MOCK_GRADE_BOOK_ROWS,
  MOCK_GRADE_BOOK_ROWS_CHILD_0,
  MOCK_GRADE_BOOK_ROWS_CHILD_1,
  MOCK_GRADE_BOOK_SUBJECT_ID,
  MOCK_GRADE_BOOK_SUBJECT_NAME,
  MOCK_VIEWER_CHILDREN,
} from "./grade-book-fixtures";

export class MockGradeBookRepository implements IGradeBookRepository {
  /**
   * publishMode is injected so the DI factory can wire the REAL operational
   * setting (gradePublishMode) into the otherwise-mocked grade book.
   */
  constructor(
    private readonly publishMode: GradePublishMode = "SELF_PUBLISH",
  ) {}

  private build(
    rows: GradeBookRow[],
    key: ClassSubjectTermKey,
    className: string,
    subjectName: string,
  ): GradeBook {
    return {
      classId: key.classId,
      subjectId: key.subjectId,
      termId: key.termId,
      academicYearLabel: key.academicYearLabel,
      className,
      subjectName,
      scheme: structuredClone(MOCK_SCHEME),
      rows: structuredClone(rows),
      publishMode: this.publishMode,
    };
  }

  async getGradeBook(key: ClassSubjectTermKey): Promise<GradeBook> {
    await mockDelay();
    return this.build(
      MOCK_GRADE_BOOK_ROWS,
      key,
      MOCK_GRADE_BOOK_CLASS_NAME,
      MOCK_GRADE_BOOK_SUBJECT_NAME,
    );
  }

  async getMyGrades(
    studentMemberId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]> {
    await mockDelay();
    const key: ClassSubjectTermKey = {
      classId: MOCK_GRADE_BOOK_CLASS_ID,
      subjectId: MOCK_GRADE_BOOK_SUBJECT_ID,
      termId: "HK1",
      academicYearLabel,
    };
    const mine = MOCK_GRADE_BOOK_ROWS.filter(
      (r) => r.studentId === studentMemberId,
    );
    const rows = mine.length > 0 ? mine : [MOCK_GRADE_BOOK_ROWS[0]];
    return [
      this.build(
        rows,
        key,
        MOCK_GRADE_BOOK_CLASS_NAME,
        MOCK_GRADE_BOOK_SUBJECT_NAME,
      ),
    ];
  }

  async getChildGrades(
    childId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]> {
    await mockDelay();
    const key: ClassSubjectTermKey = {
      classId: MOCK_GRADE_BOOK_CLASS_ID,
      subjectId: MOCK_GRADE_BOOK_SUBJECT_ID,
      termId: "HK1",
      academicYearLabel,
    };
    if (childId === "c2") {
      return [
        this.build(
          MOCK_GRADE_BOOK_ROWS_CHILD_1,
          key,
          "8B1",
          MOCK_GRADE_BOOK_SUBJECT_NAME,
        ),
      ];
    }
    return [
      this.build(
        MOCK_GRADE_BOOK_ROWS_CHILD_0,
        key,
        "11A2",
        MOCK_GRADE_BOOK_SUBJECT_NAME,
      ),
    ];
  }

  async getChildList(): Promise<ChildSummary[]> {
    await mockDelay();
    return MOCK_VIEWER_CHILDREN;
  }
}
