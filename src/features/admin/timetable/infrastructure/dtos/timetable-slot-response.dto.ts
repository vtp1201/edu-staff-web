/**
 * Wire shape for a timetable slot (camelCase, per api-integration rule). Mirrors
 * what `GET /core/api/v1/timetable` returns once the `core` service exists.
 */
export interface TimetableSlotDto {
  slotKey: string;
  classId: string;
  day: number;
  period: number;
  subjectId: string;
  teacherId: string;
  room: string;
}

export interface ConflictInfoDto {
  teacherId: string;
  day: number;
  period: number;
  classIds: string[];
}

export interface TimetableResponseDto {
  classId: string;
  yearId: string;
  slots: TimetableSlotDto[];
  conflicts: ConflictInfoDto[];
}
