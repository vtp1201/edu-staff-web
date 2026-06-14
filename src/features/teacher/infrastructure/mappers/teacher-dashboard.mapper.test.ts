import { describe, expect, it } from "vitest";
import {
  mapScheduleStatusTone,
  periodSessionKey,
  toTeacherClass,
} from "./teacher-dashboard.mapper";

describe("teacher-dashboard.mapper", () => {
  it("mapScheduleStatusTone maps each status to its tone", () => {
    expect(mapScheduleStatusTone("done")).toBe("muted");
    expect(mapScheduleStatusTone("live")).toBe("success");
    expect(mapScheduleStatusTone("upcoming")).toBe("warning");
  });

  it("periodSessionKey: <=5 morning, >5 afternoon", () => {
    expect(periodSessionKey(1)).toBe("morning");
    expect(periodSessionKey(5)).toBe("morning");
    expect(periodSessionKey(6)).toBe("afternoon");
    expect(periodSessionKey(7)).toBe("afternoon");
  });

  const classDto = {
    classId: "cls-10a1",
    tenantId: "t1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025-2026",
    status: "ACTIVE",
    homeroomTeacherId: "teacher-1",
    createdAt: "",
    updatedAt: "",
  };

  it("toTeacherClass maps DTO + count to entity", () => {
    const entity = toTeacherClass(classDto, 35, "teacher-1");
    expect(entity).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      studentCount: 35,
      isHomeroom: true,
      academicYearLabel: "2025-2026",
    });
  });

  it("toTeacherClass: isHomeroom false when current user is not the GVCN", () => {
    expect(toTeacherClass(classDto, 35, "teacher-2").isHomeroom).toBe(false);
  });

  it("toTeacherClass: isHomeroom false when homeroomTeacherId is absent", () => {
    const dto = { ...classDto, homeroomTeacherId: undefined };
    expect(toTeacherClass(dto, 35, "teacher-1").isHomeroom).toBe(false);
  });

  it("toTeacherClass: isHomeroom false when current user id is null", () => {
    expect(toTeacherClass(classDto, 35, null).isHomeroom).toBe(false);
  });
});
