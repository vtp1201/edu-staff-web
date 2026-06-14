import type { Class } from "../../domain/entities/class.entity";
import type { TeacherMember } from "../../domain/entities/teacher-member.entity";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { TeacherMemberResponseDto } from "../dtos/teacher-member-response.dto";

export const ClassManagementMapper = {
  toClass(dto: ClassResponseDto): Class {
    return {
      id: dto.id,
      name: dto.name,
      gradeLevel: dto.gradeLevel,
      status: dto.status,
      academicYear: dto.academicYear,
      studentCount: dto.studentCount,
      homeroomTeacherId: dto.homeroomTeacherId,
      homeroomTeacherName: dto.homeroomTeacherName,
    };
  },

  toTeacherMember(dto: TeacherMemberResponseDto): TeacherMember {
    return {
      userId: dto.userId,
      displayName: dto.displayName,
      email: dto.email,
    };
  },
};
