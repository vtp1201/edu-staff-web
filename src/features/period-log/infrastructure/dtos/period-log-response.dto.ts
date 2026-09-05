import type {
  PeriodDayOfWeek,
  PeriodGrade,
} from "../../domain/entities/period-log.entity";

/**
 * REAL `core` wire shape — mirrors `PeriodLogEntryResponse` verbatim
 * (camelCase, decision 0008; `services/core/docs/openapi.yaml`). Every field
 * listed here is REQUIRED by the contract, including `remark` ("" when empty,
 * never null). `subjectId`/`teacherMemberId`/`dayOfWeek`/timestamps are
 * `readOnly` — denormalised by the BE at write time, never sent by the client.
 *
 * The LIST endpoint returns a bare array of this same shape (unpaginated,
 * bounded by the ≤31-day span cap), so no separate list DTO is needed.
 */
export interface PeriodLogResponseDto {
  classId: string;
  date: string;
  periodNumber: number;
  termId: string;
  dayOfWeek: PeriodDayOfWeek;
  subjectId: string;
  teacherMemberId: string;
  lessonTitle: string;
  remark: string;
  grade: PeriodGrade;
  absentCount: number;
  createdAt: string;
  updatedAt: string;
}
