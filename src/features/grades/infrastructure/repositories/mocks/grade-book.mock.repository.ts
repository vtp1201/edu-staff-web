import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { GradeBook } from "../../../domain/entities/grade-book.entity";
import type { IGradeBookRepository } from "../../../domain/repositories/i-grade-book.repository";
import { mapGradeBook } from "../../mappers/grade-book.mapper";
import { MOCK_SCHEME } from "./fixtures";
import {
  MOCK_GRADE_BOOK_CLASS_NAME,
  MOCK_GRADE_BOOK_CS_ID,
  MOCK_GRADE_BOOK_ROWS,
  MOCK_GRADE_BOOK_SUBJECT_NAME,
  MOCK_GRADE_BOOK_TERM,
} from "./grade-book-fixtures";

export class MockGradeBookRepository implements IGradeBookRepository {
  /**
   * publishMode is injected so the DI factory can wire the REAL operational
   * setting (gradePublishMode) into the otherwise-mocked grade book.
   */
  constructor(
    private readonly publishMode: GradePublishMode = "SELF_PUBLISH",
  ) {}

  private build(rowDtos: typeof MOCK_GRADE_BOOK_ROWS, csId: string): GradeBook {
    return mapGradeBook(
      {
        classSubjectId: csId,
        term: MOCK_GRADE_BOOK_TERM,
        className: MOCK_GRADE_BOOK_CLASS_NAME,
        subjectName: MOCK_GRADE_BOOK_SUBJECT_NAME,
        rows: rowDtos,
      },
      structuredClone(MOCK_SCHEME),
      this.publishMode,
    );
  }

  async getGradeBook(csId: string, _term: string): Promise<GradeBook> {
    await mockDelay();
    return this.build(MOCK_GRADE_BOOK_ROWS, csId);
  }

  async getMyGrades(_term: string): Promise<GradeBook> {
    await mockDelay();
    return this.build([MOCK_GRADE_BOOK_ROWS[0]], MOCK_GRADE_BOOK_CS_ID);
  }

  async getChildGrades(_childId: string, _term: string): Promise<GradeBook> {
    await mockDelay();
    return this.build([MOCK_GRADE_BOOK_ROWS[1]], MOCK_GRADE_BOOK_CS_ID);
  }
}
