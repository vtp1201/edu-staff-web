import { describe, expect, it } from "vitest";
import type { DirectoryMember } from "@/features/iam-directory/domain/entities/directory-member.entity";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { SubjectAssignmentResponseDto } from "../dtos/subject-assignment-response.dto";
import { PrincipalTeachersMapper } from "./principal-teachers.mapper";

const member: DirectoryMember = {
  memberId: "m-002",
  userId: "m-002",
  displayName: "Trần Văn Minh",
  email: "minh@edu.vn",
  roles: ["TEACHER"],
  status: "ACTIVE",
};

describe("PrincipalTeachersMapper", () => {
  describe("toTeacherFromDirectoryMember", () => {
    it("maps the directory row and starts every composed field empty", () => {
      expect(
        PrincipalTeachersMapper.toTeacherFromDirectoryMember(member),
      ).toEqual({
        teacherId: "m-002",
        displayName: "Trần Văn Minh",
        email: "minh@edu.vn",
        primarySubjectName: null,
        homeroomClassId: null,
        homeroomClassName: null,
        subjectAssignments: [],
        status: "ACTIVE",
      });
    });

    it("keys the teacher on memberId (=== userId), never a surrogate id", () => {
      const entity = PrincipalTeachersMapper.toTeacherFromDirectoryMember({
        ...member,
        memberId: "m-009",
        userId: "m-009",
      });
      expect(entity.teacherId).toBe("m-009");
    });

    it.each([
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
    ] as const)("carries the IAM membership status %s through verbatim", (status) => {
      expect(
        PrincipalTeachersMapper.toTeacherFromDirectoryMember({
          ...member,
          status,
        }).status,
      ).toBe(status);
    });

    it("does not leak a roles field onto the entity", () => {
      expect(
        Object.keys(
          PrincipalTeachersMapper.toTeacherFromDirectoryMember(member),
        ).sort(),
      ).toEqual([
        "displayName",
        "email",
        "homeroomClassId",
        "homeroomClassName",
        "primarySubjectName",
        "status",
        "subjectAssignments",
        "teacherId",
      ]);
    });
  });

  describe("toSubjectAssignment", () => {
    const dto: SubjectAssignmentResponseDto = {
      classId: "c-11b1",
      subjectId: "s-van",
      teacherMemberId: "m-002",
      assignedAt: "2026-01-05T02:00:00Z",
      assignedBy: "m-admin",
    };

    it("takes className/subjectName from the caller (not on the wire)", () => {
      expect(
        PrincipalTeachersMapper.toSubjectAssignment(dto, "11B1", "Ngữ văn"),
      ).toEqual({
        classId: "c-11b1",
        className: "11B1",
        subjectId: "s-van",
        subjectName: "Ngữ văn",
      });
    });

    it("keeps subjectName null when the id is unresolvable (never the uuid)", () => {
      const entity = PrincipalTeachersMapper.toSubjectAssignment(
        dto,
        "11B1",
        null,
      );
      expect(entity.subjectName).toBeNull();
      expect(entity.subjectName).not.toBe(dto.subjectId);
    });

    it("carries no classSubjectId / hasConflict (no wire source)", () => {
      const entity = PrincipalTeachersMapper.toSubjectAssignment(
        dto,
        "11B1",
        "Ngữ văn",
      );
      expect(Object.keys(entity).sort()).toEqual([
        "classId",
        "className",
        "subjectId",
        "subjectName",
      ]);
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
