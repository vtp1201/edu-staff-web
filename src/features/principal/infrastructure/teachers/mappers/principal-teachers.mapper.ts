import type { PrincipalClassSubject } from "../../../domain/teachers/entities/class-subject.entity";
import type {
  PrincipalTeacher,
  SubjectAssignment,
} from "../../../domain/teachers/entities/principal-teacher.entity";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type {
  PrincipalTeacherResponseDto,
  SubjectAssignmentDto,
} from "../dtos/principal-teacher-response.dto";

export const PrincipalTeachersMapper = {
  toSubjectAssignment(dto: SubjectAssignmentDto): SubjectAssignment {
    return {
      classSubjectId: dto.classSubjectId,
      classId: dto.classId,
      className: dto.className,
      subjectId: dto.subjectId,
      subjectName: dto.subjectName,
      hasConflict: dto.hasConflict,
    };
  },

  toTeacher(dto: PrincipalTeacherResponseDto): PrincipalTeacher {
    return {
      teacherId: dto.teacherId,
      displayName: dto.displayName,
      email: dto.email,
      primarySubjectName: dto.primarySubjectName,
      homeroomClassId: dto.homeroomClassId,
      homeroomClassName: dto.homeroomClassName,
      subjectAssignments: dto.subjectAssignments.map((a) =>
        PrincipalTeachersMapper.toSubjectAssignment(a),
      ),
      status: dto.status,
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
