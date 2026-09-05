import type { PeriodDayOfWeek } from "../../domain/entities/period-log.entity";

/** `MaterialResponse` — both fields required on the wire. */
export interface PeriodMaterialDto {
  title: string;
  url: string;
}

/**
 * REAL `core` wire shape — mirrors `PeriodPrepResponse` verbatim.
 * `lessonPlanId` is explicitly nullable (`type: ["string","null"]`), `note` is
 * required and may be `""`. The LIST endpoint returns a bare array of this
 * shape (unpaginated).
 */
export interface PeriodPrepResponseDto {
  classId: string;
  date: string;
  periodNumber: number;
  termId: string;
  dayOfWeek: PeriodDayOfWeek;
  subjectId: string;
  teacherMemberId: string;
  note: string;
  lessonPlanId: string | null;
  materials: PeriodMaterialDto[];
  createdAt: string;
  updatedAt: string;
}
