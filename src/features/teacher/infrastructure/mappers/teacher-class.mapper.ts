import type { TeacherClassKpi } from "../../domain/entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../../domain/entities/teacher-roster-student.entity";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";
import type {
  AttendanceSummaryResponseDto,
  ViolationStateResponseDto,
} from "../dtos/homeroom-kpi-response.dto";

/** Maps a class-roster enrollment DTO to the read-only TeacherRosterStudent.
 *  `displayName` falls back to the member id when BE omits it (mock-first);
 *  `status` normalizes to the entity union, defaulting to "active". */
export function toTeacherRosterStudent(
  dto: ClassRosterItemDto,
): TeacherRosterStudent {
  return {
    enrollmentId: dto.enrollmentId,
    studentMemberId: dto.studentMemberId,
    displayName: dto.displayName?.trim() || dto.studentMemberId,
    academicYearLabel: dto.academicYearLabel,
    enrolledAt: dto.enrolledAt,
    status: dto.status === "transferred" ? "transferred" : "active",
  };
}

/** Raw, per-source inputs for the GVCN KPI slice. Each is `undefined` when its
 *  call was skipped or failed — the corresponding entity field then stays
 *  unset and the card hides that tile (never a fabricated 0). */
export interface HomeroomKpiSources {
  /** draft US-245 attendance summary (not wired today — see the repository). */
  attendance?: Pick<AttendanceSummaryResponseDto, "rate">;
  /** Every workflow state of the class's violations (no `state` query param). */
  violations?: ViolationStateResponseDto[];
  /** Length of the GVCN leave inbox page (already server-filtered SUBMITTED). */
  pendingLeaveCount?: number;
}

/** Composes the GVCN KPI slice from its three independent sources. Pure. */
export function toHomeroomKpi(
  sources: HomeroomKpiSources,
): Partial<TeacherClassKpi> {
  const rate = sources.attendance?.rate;
  // `""` means "no recorded day in the term" — an ABSENT measurement, not 0%.
  const parsed = rate ? Number.parseFloat(rate) : Number.NaN;

  return {
    ...(Number.isNaN(parsed) ? {} : { attendanceRate: parsed }),
    ...(sources.violations
      ? {
          openViolations: sources.violations.filter(
            (v) => v.state === "SUBMITTED",
          ).length,
        }
      : {}),
    ...(sources.pendingLeaveCount !== undefined
      ? { pendingLeave: sources.pendingLeaveCount }
      : {}),
    // Real endpoints — never demo data (the mock repository flags its own).
    demoFields: [],
  };
}
