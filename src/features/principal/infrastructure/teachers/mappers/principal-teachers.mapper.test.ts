import { describe, expect, it } from "vitest";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type {
  PrincipalTeacherResponseDto,
  SubjectAssignmentDto,
} from "../dtos/principal-teacher-response.dto";
import { PrincipalTeachersMapper } from "./principal-teachers.mapper";

describe("PrincipalTeachersMapper", () => {
  it("toSubjectAssignment maps all fields", () => {
    const dto: SubjectAssignmentDto = {
      classSubjectId: "cs-001",
      classId: "c-11b1",
      className: "11B1",
      subjectId: "s-van",
      subjectName: "Ngữ văn",
      hasConflict: true,
    };
    expect(PrincipalTeachersMapper.toSubjectAssignment(dto)).toEqual(dto);
  });

  it("toTeacher maps all fields including nested assignments", () => {
    const dto: PrincipalTeacherResponseDto = {
      teacherId: "t-002",
      displayName: "Trần Văn Minh",
      email: "minh@edu.vn",
      primarySubjectName: "Văn",
      homeroomClassId: null,
      homeroomClassName: null,
      subjectAssignments: [
        {
          classSubjectId: "cs-001",
          classId: "c-11b1",
          className: "11B1",
          subjectId: "s-van",
          subjectName: "Ngữ văn",
          hasConflict: false,
        },
      ],
      status: "ACTIVE",
    };
    const entity = PrincipalTeachersMapper.toTeacher(dto);
    expect(entity).toEqual({
      teacherId: "t-002",
      displayName: "Trần Văn Minh",
      email: "minh@edu.vn",
      primarySubjectName: "Văn",
      homeroomClassId: null,
      homeroomClassName: null,
      subjectAssignments: [
        {
          classSubjectId: "cs-001",
          classId: "c-11b1",
          className: "11B1",
          subjectId: "s-van",
          subjectName: "Ngữ văn",
          hasConflict: false,
        },
      ],
      status: "ACTIVE",
    });
  });

  it("toClassSubject maps all fields with null teacher", () => {
    const dto: ClassSubjectResponseDto = {
      id: "cs-003",
      classId: "c-10a1",
      subjectId: "s-toan",
      subjectName: "Toán",
      teacherId: null,
      teacherName: null,
    };
    expect(PrincipalTeachersMapper.toClassSubject(dto)).toEqual({
      id: "cs-003",
      classId: "c-10a1",
      subjectId: "s-toan",
      subjectName: "Toán",
      teacherId: null,
      teacherName: null,
    });
  });
});
