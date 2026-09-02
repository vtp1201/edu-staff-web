import {
  deriveClassRoles,
  type TeacherClass,
  type TeacherClassKpi,
  type TeacherClassSubject,
} from "../../domain/entities/teacher-class.entity";
import type { TeacherClassResponseDto } from "../dtos/teacher-class-response.dto";

/** Maps a class DTO + its computed enrollment count to the TeacherClass entity.
 *  `currentUserId` is the token's `memberId` claim (ADR 0074 — NEVER `sub`): it
 *  alone drives the GVCN flag. `subjectNames` is the drained subject catalogue
 *  (`id → name`); a miss falls back to the raw id (graceful degrade). */
export function toTeacherClass(
  dto: TeacherClassResponseDto,
  studentCount: number,
  currentUserId: string | null,
  subjectNames?: ReadonlyMap<string, string>,
): TeacherClass {
  const isHomeroom =
    currentUserId != null &&
    dto.homeroomTeacherId != null &&
    dto.homeroomTeacherId === currentUserId;

  const subjects: TeacherClassSubject[] = (dto.teachingSubjectIds ?? []).map(
    (id) => ({ id, name: subjectNames?.get(id)?.trim() || id }),
  );

  const kpi = toSubjectTeacherKpi(dto);

  return {
    id: dto.classId,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    studentCount,
    isHomeroom,
    roles: deriveClassRoles(isHomeroom, dto.teachingSubjectIds),
    subjects,
    ...(kpi ? { kpi } : {}),
    academicYearLabel: dto.academicYearLabel,
  };
}

/** GVBM KPI slice carried directly on `ClassResponse` (draft US-255). Returns
 *  `undefined` while BE ships neither field — the card then renders no tile
 *  rather than a fabricated zero. */
function toSubjectTeacherKpi(
  dto: TeacherClassResponseDto,
): TeacherClassKpi | undefined {
  if (dto.absentToday === undefined && dto.pendingGrading === undefined)
    return undefined;
  return {
    ...(dto.absentToday !== undefined ? { absentToday: dto.absentToday } : {}),
    ...(dto.pendingGrading !== undefined
      ? { pendingGrading: dto.pendingGrading }
      : {}),
    // Real wire values are never demo data (ADR 0076) — only the mock repo
    // flags fields here.
    demoFields: [],
  };
}

/** Schedule status → presentation StatusBadge tone key (pure, unit-tested). */
export function mapScheduleStatusTone(
  status: "done" | "live" | "upcoming",
): "muted" | "success" | "warning" {
  switch (status) {
    case "done":
      return "muted";
    case "live":
      return "success";
    case "upcoming":
      return "warning";
  }
}

/** Periods 1–5 are morning, 6+ are afternoon (school-day convention). */
export function periodSessionKey(period: number): "morning" | "afternoon" {
  return period <= 5 ? "morning" : "afternoon";
}
