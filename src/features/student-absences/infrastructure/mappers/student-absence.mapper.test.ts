import { describe, expect, it } from "vitest";
import type { StudentAbsenceResponseDto } from "../dtos/student-absence-response.dto";
import { toStudentAbsenceEntity } from "./student-absence.mapper";

const dto = (
  over: Partial<StudentAbsenceResponseDto> = {},
): StudentAbsenceResponseDto => ({
  classId: "11B2",
  studentMemberId: "stu-1",
  date: "2026-05-05",
  reason: "Sốt cao.",
  excused: true,
  state: "RECORDED",
  recordedByMemberId: "teacher-1",
  createdAt: "2026-05-05T07:40:00Z",
  updatedAt: "2026-05-05T07:40:00Z",
  ...over,
});

describe("toStudentAbsenceEntity", () => {
  it("copies every wire field 1:1", () => {
    expect(toStudentAbsenceEntity(dto())).toEqual({
      classId: "11B2",
      studentMemberId: "stu-1",
      date: "2026-05-05",
      reason: "Sốt cao.",
      excused: true,
      state: "RECORDED",
      recordedByMemberId: "teacher-1",
      createdAt: "2026-05-05T07:40:00Z",
      updatedAt: "2026-05-05T07:40:00Z",
    });
  });

  it("carries the flagged state and flaggedByMemberId through", () => {
    const entity = toStudentAbsenceEntity(
      dto({ state: "FLAGGED_UNEXCUSED", flaggedByMemberId: "admin-1" }),
    );
    expect(entity.state).toBe("FLAGGED_UNEXCUSED");
    expect(entity.flaggedByMemberId).toBe("admin-1");
  });

  it("keeps excused ORTHOGONAL to state (excused AND flagged is legal, FR-007/AC-007.4)", () => {
    const entity = toStudentAbsenceEntity(
      dto({ excused: true, state: "FLAGGED_UNEXCUSED" }),
    );
    expect(entity.excused).toBe(true);
    expect(entity.state).toBe("FLAGGED_UNEXCUSED");
  });

  it("normalises an empty reason to undefined (no empty-string noise in the row)", () => {
    expect(toStudentAbsenceEntity(dto({ reason: "" })).reason).toBeUndefined();
    expect(
      toStudentAbsenceEntity(dto({ reason: "   " })).reason,
    ).toBeUndefined();
    expect(
      toStudentAbsenceEntity(dto({ reason: undefined })).reason,
    ).toBeUndefined();
  });

  it("does NOT invent display fields — no studentName/className on the entity (FR-010)", () => {
    const entity = toStudentAbsenceEntity(dto());
    expect("studentName" in entity).toBe(false);
    expect("className" in entity).toBe(false);
  });

  it("is pure — mutating the result never touches the DTO", () => {
    const source = dto();
    const entity = toStudentAbsenceEntity(source);
    entity.excused = false;
    expect(source.excused).toBe(true);
  });
});
