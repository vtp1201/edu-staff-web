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

export const ClassManagementMapper = {
  /**
   * `studentCount` + homeroom fields are read STRAIGHT off the DTO since BE
   * US-173 enriched `ClassResponse` (US-E18.30 dropped the old injected
   * `ClassEnrichment` object and the 2×N fan-out that produced it). Callers
   * must only pass a DTO from an ENRICHED endpoint (`GET /classes`,
   * `GET /classes/{id}`) when those values matter — `POST`/`PATCH` return
   * `0`/`null` unenriched.
   *
   * `homeroomTeacherId` is authoritative for "has a homeroom teacher"; a null
   * `homeroomTeacherName` alongside a non-null id means the cross-service name
   * lookup degraded, so the display falls back to the raw member id (same
   * precedent as `toTeacherMemberFromHomeroom`) rather than letting
   * presentation's `?? "chưa phân công"` render a lie.
   */
  toClass(dto: ClassResponseDto): Class {
    return {
      id: dto.classId,
      name: dto.name,
      gradeLevel: dto.gradeLevel,
      status: dto.status,
      academicYear: dto.academicYearLabel,
      studentCount: dto.studentCount,
      homeroomTeacherId: dto.homeroomTeacherId,
      homeroomTeacherName:
        dto.homeroomTeacherId === null
          ? null
          : (dto.homeroomTeacherName ?? dto.homeroomTeacherId),
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
