import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type { ClassDto } from "../dtos/classes-response.dto";
import type { RosterStudentDto } from "../dtos/roster-response.dto";
import type { SearchStudentDto } from "../dtos/search-students-response.dto";

function toGender(raw: string): RosterStudent["gender"] {
  return raw === "F" ? "F" : "M";
}

function toStatus(raw: string): RosterStudent["status"] {
  return raw === "transferred" ? "transferred" : "active";
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

export function toRosterStudent(dto: RosterStudentDto): RosterStudent {
  return {
    id: dto.id,
    name: dto.name,
    dob: dto.dob,
    gender: toGender(dto.gender),
    status: toStatus(dto.status),
  };
}

export function toSearchStudent(dto: SearchStudentDto): SearchStudent {
  return {
    id: dto.id,
    name: dto.name,
    currentClassId: dto.currentClassId,
    currentClassName: dto.currentClassName,
  };
}
