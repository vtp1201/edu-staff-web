import type { GradeEntryResponseDto } from "./grades-response.dto";

export type {
  GradeColumnResponseDto,
  ListGradesResponseDto,
  StudentGradeRowResponseDto,
} from "./grades-response.dto";

/** One (subject, term) group within a student's year-scoped self-view. */
export interface SubjectTermGradesResponseDto {
  subjectId: string;
  termId: string;
  entries: GradeEntryResponseDto[];
}

/** `GET /members/{memberId}/grades?year=` — student self / parent-linked / admin. */
export interface StudentGradesResponseDto {
  studentMemberId: string;
  academicYearLabel: string;
  groups: SubjectTermGradesResponseDto[];
}
