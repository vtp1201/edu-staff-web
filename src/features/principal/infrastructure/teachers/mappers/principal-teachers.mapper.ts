import type { DirectoryMember } from "@/features/iam-directory/domain/entities/directory-member.entity";
import type { PrincipalClassSubject } from "../../../domain/teachers/entities/class-subject.entity";
import type {
  PrincipalTeacher,
  SubjectAssignment,
} from "../../../domain/teachers/entities/principal-teacher.entity";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { SubjectAssignmentResponseDto } from "../dtos/subject-assignment-response.dto";

export const PrincipalTeachersMapper = {
  /**
   * IAM directory member → teacher row (US-E18.40).
   *
   * The directory is the AUTHORITY for which rows exist; everything the wire
   * does not carry starts empty and is filled by the repository's composition
   * step (homeroom from the enriched class list, subject assignments from the
   * per-class fan-out). `roles` is not mapped — the caller already filtered by
   * `role: "TEACHER"`, so re-deriving it here would add a field no screen reads.
   */
  toTeacherFromDirectoryMember(member: DirectoryMember): PrincipalTeacher {
    return {
      teacherId: member.memberId,
      displayName: member.displayName,
      email: member.email,
      primarySubjectName: null,
      homeroomClassId: null,
      homeroomClassName: null,
      subjectAssignments: [],
      status: member.status,
    };
  },

  /**
   * `SubjectAssignmentResponse` → entity. `className` and `subjectName` are NOT
   * on the wire, so they are supplied by the caller (the class the fan-out came
   * from / the subject-catalogue lookup); an unresolvable subject stays `null`.
   */
  toSubjectAssignment(
    dto: SubjectAssignmentResponseDto,
    className: string,
    subjectName: string | null,
  ): SubjectAssignment {
    return {
      classId: dto.classId,
      className,
      subjectId: dto.subjectId,
      subjectName,
    };
  },

  toClassSubject(dto: ClassSubjectResponseDto): PrincipalClassSubject {
    return {
      id: dto.id,
      classId: dto.classId,
      subjectId: dto.subjectId,
      subjectName: dto.subjectName,
      teacherId: dto.teacherId,
      teacherName: dto.teacherName,
    };
  },
};
