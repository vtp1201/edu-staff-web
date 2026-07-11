import { describe, expect, it } from "vitest";
import type {
  AcademicYearResponseDto,
  TermResponseDto,
} from "../dtos/academic-year-response.dto";
import { AcademicYearMapper, TermMapper } from "./calendar.mapper";

function termDto(over: Partial<TermResponseDto> = {}): TermResponseDto {
  return {
    termId: "tm1",
    academicYearId: "ay1",
    tenantId: "tn1",
    name: "Học kỳ 1",
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    status: "ACTIVE",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...over,
  };
}

function yearDto(
  over: Partial<AcademicYearResponseDto> = {},
): AcademicYearResponseDto {
  return {
    academicYearId: "ay1",
    tenantId: "tn1",
    label: "2025–2026",
    status: "DRAFT",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...over,
  };
}

describe("TermMapper.fromDto", () => {
  it("maps termId → id and copies date fields", () => {
    const term = TermMapper.fromDto(termDto({ termId: "tm42" }));
    expect(term.id).toBe("tm42");
    expect(term.name).toBe("Học kỳ 1");
    expect(term.startDate).toBe("2025-09-01");
    expect(term.endDate).toBe("2025-12-31");
  });

  it("always maps hasGrades to false (no such field on the wire)", () => {
    // Even an ARCHIVED term reports hasGrades false — the real protection is
    // the 409 CALENDAR_TERM_IN_USE on archive, not this client-side flag.
    expect(TermMapper.fromDto(termDto({ status: "ARCHIVED" })).hasGrades).toBe(
      false,
    );
    expect(TermMapper.fromDto(termDto({ status: "ACTIVE" })).hasGrades).toBe(
      false,
    );
  });
});

describe("AcademicYearMapper.fromFlatDto", () => {
  it("maps academicYearId → id and label", () => {
    const flat = AcademicYearMapper.fromFlatDto(
      yearDto({ academicYearId: "ay9" }),
    );
    expect(flat.id).toBe("ay9");
    expect(flat.label).toBe("2025–2026");
  });

  it("derives isActive from status === ACTIVE", () => {
    expect(
      AcademicYearMapper.fromFlatDto(yearDto({ status: "ACTIVE" })).isActive,
    ).toBe(true);
    expect(
      AcademicYearMapper.fromFlatDto(yearDto({ status: "DRAFT" })).isActive,
    ).toBe(false);
    expect(
      AcademicYearMapper.fromFlatDto(yearDto({ status: "ARCHIVED" })).isActive,
    ).toBe(false);
  });
});

describe("AcademicYearMapper.fromDto (flat year + terms → nested entity)", () => {
  it("assembles the nested terms array the domain entity expects", () => {
    const year = AcademicYearMapper.fromDto(yearDto({ status: "ACTIVE" }), [
      termDto({ termId: "tm1", name: "HK1" }),
      termDto({ termId: "tm2", name: "HK2" }),
    ]);
    expect(year.id).toBe("ay1");
    expect(year.isActive).toBe(true);
    expect(year.terms).toHaveLength(2);
    expect(year.terms.map((t) => t.id)).toEqual(["tm1", "tm2"]);
    expect(year.terms.every((t) => t.hasGrades === false)).toBe(true);
  });

  it("produces an empty terms array when no terms passed", () => {
    const year = AcademicYearMapper.fromDto(yearDto(), []);
    expect(year.terms).toEqual([]);
  });
});
