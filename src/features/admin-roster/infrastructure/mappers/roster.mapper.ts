import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { ClassDto } from "../dtos/classes-response.dto";
import type { EnrollmentDto } from "../dtos/enrollment-response.dto";

/**
 * The IAM decoration for ONE student, as the injected lookup port yields it
 * (see `ResolveStudentDetails` in `roster.repository.ts`). Every field is
 * optional: staff-tier `dob`/`gender` are optional per user (ADR-0122), and a
 * member the batch lookup could not resolve yields no entry at all.
 *
 * `gender` is the RAW IAM enum — this mapper is the only place it is
 * translated into the roster's display code.
 */
export interface RosterStudentDetail {
  name?: string;
  /** RFC3339 date-time (`2010-03-15T00:00:00Z`). */
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

function toGender(raw: RosterStudentDetail["gender"]): RosterStudent["gender"] {
  switch (raw) {
    case "MALE":
      return "M";
    case "FEMALE":
      return "F";
    // "Khác" is a real self-reported value; coercing it to M/F would invent data.
    case "OTHER":
      return "O";
    default:
      return undefined;
  }
}

/**
 * RFC3339 date-time → `dd/MM/yyyy`, by SLICING the calendar part out of the
 * string. Deliberately not `new Date(...)`: a date-only value serialised as UTC
 * midnight shifts a day when formatted in UTC+7. An unparseable value yields
 * `undefined` so presentation shows its "chưa cập nhật" placeholder rather than
 * "NaN/NaN/NaN".
 */
function toDobDisplay(raw: string | undefined): string | undefined {
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : undefined;
}

/**
 * Homeroom fields are read STRAIGHT off the DTO since BE US-173 enriched
 * `ClassResponse` (US-E18.30 dropped the per-row `GET .../homeroom-teacher`
 * fan-out — and with it the raw-uuid display it produced). Callers must only
 * pass a DTO from an ENRICHED endpoint (`GET /classes`, `GET /classes/{id}`).
 *
 * `homeroomTeacherId` is authoritative for "has a homeroom teacher"; a null
 * `homeroomTeacherName` alongside a non-null id means the cross-service name
 * lookup degraded, so the display falls back to the raw member id (same rule as
 * `ClassManagementMapper.toClass`) rather than rendering "chưa phân công" for a
 * class that DOES have a GVCN. `null` = genuinely no homeroom assigned.
 */
export function toClassSummary(dto: ClassDto): ClassSummary {
  return {
    id: dto.classId,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    homeroomTeacher:
      dto.homeroomTeacherId === null
        ? null
        : (dto.homeroomTeacherName ?? dto.homeroomTeacherId),
    year: dto.academicYearLabel,
  };
}

/**
 * Enrollment row (core, authority) + IAM detail (decoration) → roster row.
 *
 * Two rules make this honest rather than convenient:
 *
 * 1. **Conditional spread.** An unresolved name or an unset dob/gender leaves
 *    the KEY ABSENT — never `name: undefined` and never a placeholder string.
 *    Absence is the domain fact; the placeholder copy belongs to presentation
 *    (i18n), and a materialised `undefined` would make the two states
 *    indistinguishable from a value that was set to empty.
 * 2. **`status` is the constant `"active"`.** `EnrollmentResponse` has no
 *    status field and none is inferable: core hard-deletes the enrollment row
 *    on unenroll/transfer (`RemoveStudentFromClassUseCase`, ADR 0049), so a
 *    student who left simply stops appearing in this list. Every row the
 *    endpoint returns IS a current enrollment. That is a semantic reading of
 *    the contract, not an invented field — and it is why we do NOT try to
 *    detect "transferred" from data that does not exist on the wire.
 */
export function toRosterStudentFromEnrollment(
  dto: EnrollmentDto,
  detail?: RosterStudentDetail,
): RosterStudent {
  const dob = toDobDisplay(detail?.dob);
  const gender = toGender(detail?.gender);
  return {
    id: dto.studentMemberId,
    ...(detail?.name !== undefined ? { name: detail.name } : {}),
    ...(dob !== undefined ? { dob } : {}),
    ...(gender !== undefined ? { gender } : {}),
    // No `code`: no core/IAM contract carries a human student code.
    status: "active",
  };
}

/**
 * There is NO `toSearchStudent` mapper any more (US-E18.41). The Add-panel's
 * candidate pool has no wire DTO of its own: it is a SET DIFFERENCE the FE
 * composes (IAM STUDENT directory MINUS core's enrolled ids, BE US-182 / ADR
 * 0125), built directly in `RosterRepository.getSearchPool`. The former
 * `SearchStudentDto` described the response of `/core/api/v1/students/
 * unassigned`, an endpoint that never existed on any server, so it and its
 * mapper were deleted rather than left as unverified fiction.
 */
