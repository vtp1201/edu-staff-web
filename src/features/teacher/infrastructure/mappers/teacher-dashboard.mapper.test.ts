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
    studentCount: 35,
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
      roles: ["homeroom"],
      subjects: [],
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

  // ── US-E24.7: roles / subjects / KPI on the class card ──────────────────
  describe("toTeacherClass — roles, subjects, KPI (US-E24.7)", () => {
    const subjectNames = new Map([
      ["sub-math", "Toán"],
      ["sub-physics", "Vật lý"],
    ]);

    it("derives BOTH roles when the GVCN also teaches a subject in the class", () => {
      const entity = toTeacherClass(
        { ...classDto, teachingSubjectIds: ["sub-math"] },
        35,
        "teacher-1",
        subjectNames,
      );
      expect(entity.roles).toEqual(["homeroom", "subject"]);
      expect(entity.subjects).toEqual([{ id: "sub-math", name: "Toán" }]);
    });

    it("derives only the subject role for a GVBM class", () => {
      const entity = toTeacherClass(
        {
          ...classDto,
          homeroomTeacherId: "teacher-9",
          teachingSubjectIds: ["sub-math", "sub-physics"],
        },
        28,
        "teacher-1",
        subjectNames,
      );
      expect(entity.roles).toEqual(["subject"]);
      expect(entity.subjects.map((s) => s.name)).toEqual(["Toán", "Vật lý"]);
    });

    it("falls back to the raw subject id when the catalogue lookup misses", () => {
      const entity = toTeacherClass(
        { ...classDto, teachingSubjectIds: ["sub-unknown"] },
        35,
        "teacher-1",
        subjectNames,
      );
      expect(entity.subjects).toEqual([
        { id: "sub-unknown", name: "sub-unknown" },
      ]);
    });

    /** ADR 0074 forge: the GVCN flag must come from the `memberId` claim only.
     *  A token whose `sub` matches `homeroomTeacherId` while `memberId` does
     *  NOT must never yield a homeroom card. */
    it("never treats a `sub`-matching-but-memberId-mismatching caller as GVCN", () => {
      const forged = {
        ...classDto,
        homeroomTeacherId: "USR-sub-claim",
        // A stray `sub`-shaped field on the wire must be ignored by the mapper.
        sub: "USR-sub-claim",
      } as typeof classDto;
      expect(toTeacherClass(forged, 35, "MEMBER-different").isHomeroom).toBe(
        false,
      );
      expect(toTeacherClass(forged, 35, "MEMBER-different").roles).toEqual([]);
    });

    it("sets the GVBM KPI slice only when the draft fields are present (US-255)", () => {
      const withKpi = toTeacherClass(
        {
          ...classDto,
          homeroomTeacherId: null,
          teachingSubjectIds: ["sub-math"],
          absentToday: 2,
          pendingGrading: 0,
        },
        35,
        "teacher-1",
        subjectNames,
      );
      expect(withKpi.kpi).toEqual({
        absentToday: 2,
        pendingGrading: 0,
        demoFields: [],
      });
    });

    it("leaves `kpi` undefined when BE ships neither draft field", () => {
      const entity = toTeacherClass(
        { ...classDto, teachingSubjectIds: ["sub-math"] },
        35,
        "teacher-1",
        subjectNames,
      );
      expect(entity.kpi).toBeUndefined();
    });
  });
});
