import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "../../domain/entities/class.entity";
import type { TeacherMember } from "../../domain/entities/teacher-member.entity";
import type {
  ClassResponseDto,
  CreateClassRequestDto,
  UpdateClassRequestDto,
} from "../dtos/class-response.dto";
import type { HomeroomAssignmentResponseDto } from "../dtos/homeroom-assignment-response.dto";

/**
 * Real-mode enrichment for fields the wire `ClassResponse` does not carry
 * (US-E18.4 — no `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` on
 * `ClassResponse`). Callers derive these via separate fan-out calls and inject
 * them here — the mapper never invents them.
 */
export interface ClassEnrichment {
  studentCount: number;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
}

export const ClassManagementMapper = {
  toClass(dto: ClassResponseDto, enrichment: ClassEnrichment): Class {
    return {
      id: dto.classId,
      name: dto.name,
      gradeLevel: dto.gradeLevel,
      status: dto.status,
      academicYear: dto.academicYearLabel,
      studentCount: enrichment.studentCount,
      homeroomTeacherId: enrichment.homeroomTeacherId,
      homeroomTeacherName: enrichment.homeroomTeacherName,
    };
  },

  toCreateClassBody(input: CreateClassInput): CreateClassRequestDto {
    return {
      name: input.name,
      gradeLevel: input.gradeLevel,
      academicYearLabel: input.academicYear,
    };
  },

  /** Real `UpdateClassRequest` requires BOTH fields — caller backfills first. */
  toUpdateClassBody(
    input: Required<Pick<RenameClassInput, "name" | "gradeLevel">>,
  ): UpdateClassRequestDto {
    return { name: input.name, gradeLevel: input.gradeLevel };
  },

  /**
   * Wire has no display name for a homeroom teacher — only `teacherMemberId`
   * (raw uuid). IAM has no public endpoint to resolve a member id to a name
   * (cross-repo gap, EPIC-OVERVIEW.md ask #6/#7) — fall back to the raw id,
   * same precedent as US-E18.2's `memberName`.
   */
  toTeacherMemberFromHomeroom(
    dto: HomeroomAssignmentResponseDto,
  ): TeacherMember {
    return {
      userId: dto.teacherMemberId,
      displayName: dto.teacherMemberId,
      email: "",
    };
  },
};
