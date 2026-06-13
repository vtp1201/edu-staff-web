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

export function toClassSummary(dto: ClassDto): ClassSummary {
  return {
    id: dto.id,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    homeroomTeacher: dto.homeroomTeacher,
    year: dto.year,
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
