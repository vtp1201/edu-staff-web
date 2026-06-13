import { describe, expect, it } from "vitest";
import {
  toClassSummary,
  toRosterStudent,
  toSearchStudent,
} from "./roster.mapper";

describe("roster.mapper", () => {
  it("toClassSummary passes camelCase fields through", () => {
    const result = toClassSummary({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      homeroomTeacher: "Nguyễn Thị Hương",
      year: "2025–2026",
    });
    expect(result).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      homeroomTeacher: "Nguyễn Thị Hương",
      year: "2025–2026",
    });
  });

  it("toClassSummary preserves null homeroomTeacher", () => {
    const result = toClassSummary({
      id: "cls-10b3",
      name: "10B3",
      gradeLevel: 10,
      homeroomTeacher: null,
      year: "2025–2026",
    });
    expect(result.homeroomTeacher).toBeNull();
  });

  it("toRosterStudent maps known gender + status", () => {
    const result = toRosterStudent({
      id: "HS25001",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    });
    expect(result).toEqual({
      id: "HS25001",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    });
  });

  it("toRosterStudent guards unexpected gender to M", () => {
    const result = toRosterStudent({
      id: "x",
      name: "x",
      dob: "01/01/2010",
      gender: "X",
      status: "active",
    });
    expect(result.gender).toBe("M");
  });

  it("toRosterStudent guards unexpected status to active", () => {
    const result = toRosterStudent({
      id: "x",
      name: "x",
      dob: "01/01/2010",
      gender: "F",
      status: "weird",
    });
    expect(result.status).toBe("active");
  });

  it("toSearchStudent passes nullable class fields through", () => {
    expect(
      toSearchStudent({
        id: "HS25202",
        name: "Trần Thuỵ Vân",
        currentClassId: "cls-10a2",
        currentClassName: "10A2",
      }),
    ).toEqual({
      id: "HS25202",
      name: "Trần Thuỵ Vân",
      currentClassId: "cls-10a2",
      currentClassName: "10A2",
    });
    expect(
      toSearchStudent({
        id: "HS25201",
        name: "x",
        currentClassId: null,
        currentClassName: null,
      }).currentClassId,
    ).toBeNull();
  });
});
