import { describe, expect, it } from "vitest";
import {
  type TermRecord,
  type TermStatus,
  UNRESOLVED_YEAR_ID,
} from "../entities/academic-record.entity";
import { buildAcademicRecord } from "./build-academic-record";

function term(
  classId: string,
  termId: string,
  status: TermStatus = "SEALED",
): TermRecord {
  return {
    classId,
    termId,
    status,
    sealedAt: null,
    sealedBy: null,
    unsealedAt: null,
    unsealedBy: null,
    unsealReason: null,
    resealCount: 0,
    subjects: [],
    gpa: null,
  };
}

describe("buildAcademicRecord — client-side year grouping (US-E18.54)", () => {
  it("groups the flat record list by the resolved academic year", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [
        term("c-9", "HK1"),
        term("c-9", "HK2"),
        term("c-10", "HK1"),
        term("c-10", "HK2"),
      ],
      new Map([
        ["c-9", "2024-2025"],
        ["c-10", "2025-2026"],
      ]),
    );

    expect(record.studentMemberId).toBe("stu-1");
    expect(record.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      "2025-2026",
    ]);
    expect(record.years[0].yearLabel).toBe("2024-2025");
    expect(record.years[0].terms.map((t) => t.termId)).toEqual(["HK1", "HK2"]);
  });

  it("merges two classes that resolve to the SAME year into one year group", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [term("c-a", "HK1"), term("c-b", "HK2")],
      new Map([
        ["c-a", "2025-2026"],
        ["c-b", "2025-2026"],
      ]),
    );

    expect(record.years).toHaveLength(1);
    expect(record.years[0].terms).toHaveLength(2);
  });

  it("orders years ascending by label and marks the LAST resolved one current", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [term("c-10", "HK1"), term("c-8", "HK1"), term("c-9", "HK1")],
      new Map([
        ["c-8", "2023-2024"],
        ["c-9", "2024-2025"],
        ["c-10", "2025-2026"],
      ]),
    );

    expect(record.years.map((y) => y.yearId)).toEqual([
      "2023-2024",
      "2024-2025",
      "2025-2026",
    ]);
    expect(record.years.map((y) => y.isCurrent)).toEqual([false, false, true]);
  });

  it("sorts terms inside a year by termId so HK1 precedes HK2 regardless of wire order", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [term("c-9", "HK2"), term("c-9", "HK1")],
      new Map([["c-9", "2024-2025"]]),
    );

    expect(record.years[0].terms.map((t) => t.termId)).toEqual(["HK1", "HK2"]);
  });

  it("puts records with an UNRESOLVED class year in a clearly-degraded bucket, last, never dropped and never fabricated", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [term("c-9", "HK1"), term("c-mystery", "HK1")],
      new Map([["c-9", "2024-2025"]]),
    );

    expect(record.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      UNRESOLVED_YEAR_ID,
    ]);
    const unresolved = record.years[1];
    expect(unresolved.yearLabel).toBeNull();
    expect(unresolved.terms).toHaveLength(1);
    expect(unresolved.terms[0].classId).toBe("c-mystery");
    // The degraded bucket is never "the current year".
    expect(unresolved.isCurrent).toBe(false);
  });

  it("marks nothing current when NO year resolved (whole-record degrade)", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [term("c-x", "HK1")],
      new Map(),
    );

    expect(record.years).toHaveLength(1);
    expect(record.years[0].yearId).toBe(UNRESOLVED_YEAR_ID);
    expect(record.years[0].isCurrent).toBe(false);
  });

  it("derives each year's seal status from its terms", () => {
    const record = buildAcademicRecord(
      "stu-1",
      [
        term("c-8", "HK1", "SEALED"),
        term("c-8", "HK2", "PENDING"),
        term("c-9", "HK1", "UNSEALED"),
        term("c-10", "HK1", "SEALED"),
      ],
      new Map([
        ["c-8", "2023-2024"],
        ["c-9", "2024-2025"],
        ["c-10", "2025-2026"],
      ]),
    );

    expect(record.years.map((y) => y.sealStatus)).toEqual([
      "partial",
      "unsealed_in_year",
      "all_sealed",
    ]);
  });

  it("is sealed only when every term of every year is SEALED", () => {
    const all = buildAcademicRecord(
      "stu-1",
      [term("c-9", "HK1"), term("c-9", "HK2")],
      new Map([["c-9", "2024-2025"]]),
    );
    expect(all.sealed).toBe(true);

    const some = buildAcademicRecord(
      "stu-1",
      [term("c-9", "HK1"), term("c-9", "HK2", "PENDING")],
      new Map([["c-9", "2024-2025"]]),
    );
    expect(some.sealed).toBe(false);
  });

  it("an empty record list yields no years and is NOT sealed", () => {
    const record = buildAcademicRecord("stu-1", [], new Map());
    expect(record.years).toEqual([]);
    expect(record.sealed).toBe(false);
  });
});
