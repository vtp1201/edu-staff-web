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

  it("toTeacherClass maps DTO + count to entity", () => {
    const entity = toTeacherClass(
      {
        classId: "cls-10a1",
        tenantId: "t1",
        name: "10A1",
        gradeLevel: 10,
        academicYearLabel: "2025-2026",
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
      },
      35,
    );
    expect(entity).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      studentCount: 35,
    });
  });
});
