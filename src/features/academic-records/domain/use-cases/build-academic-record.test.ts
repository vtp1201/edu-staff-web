import { describe, expect, it } from "vitest";
import {
  type TermRecord,
  type TermStatus,
  UNRESOLVED_YEAR_ID,
} from "../entities/academic-record.entity";
import { buildAcademicRecord } from "./build-academic-record";

/**
 * `academicYear` now rides the record itself (US-E18.56 — BE denormalized it
 * onto every `AcademicRecordResponse` row), so the grouping takes NO year map:
 * `null` = the wire key was absent on an unhealed pre-migration row.
 */
function term(
  classId: string,
  termId: string,
  academicYear: string | null,
  status: TermStatus = "SEALED",
): TermRecord {
  return {
    classId,
    termId,
    academicYear,
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

describe("buildAcademicRecord — year grouping off the record's own field (US-E18.56)", () => {
  it("groups the flat record list by each record's academicYear", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-9", "HK1", "2024-2025"),
      term("c-9", "HK2", "2024-2025"),
      term("c-10", "HK1", "2025-2026"),
      term("c-10", "HK2", "2025-2026"),
    ]);

    expect(record.studentMemberId).toBe("stu-1");
    expect(record.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      "2025-2026",
    ]);
    expect(record.years[0].yearLabel).toBe("2024-2025");
    expect(record.years[0].terms.map((t) => t.termId)).toEqual(["HK1", "HK2"]);
  });

  it("merges two classes carrying the SAME year into one year group", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-a", "HK1", "2025-2026"),
      term("c-b", "HK2", "2025-2026"),
    ]);

    expect(record.years).toHaveLength(1);
    expect(record.years[0].terms).toHaveLength(2);
  });

  it("orders years ascending by label and marks the LAST resolved one current", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-10", "HK1", "2025-2026"),
      term("c-8", "HK1", "2023-2024"),
      term("c-9", "HK1", "2024-2025"),
    ]);

    expect(record.years.map((y) => y.yearId)).toEqual([
      "2023-2024",
      "2024-2025",
      "2025-2026",
    ]);
    expect(record.years.map((y) => y.isCurrent)).toEqual([false, false, true]);
  });

  it("sorts terms inside a year by termId so HK1 precedes HK2 regardless of wire order", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-9", "HK2", "2024-2025"),
      term("c-9", "HK1", "2024-2025"),
    ]);

    expect(record.years[0].terms.map((t) => t.termId)).toEqual(["HK1", "HK2"]);
  });

  it("puts a record with NO academicYear in a clearly-degraded bucket, last, never dropped and never fabricated", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-9", "HK1", "2024-2025"),
      term("c-mystery", "HK1", null),
    ]);

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

  it("marks nothing current when NO record carries a year (whole-record degrade)", () => {
    const record = buildAcademicRecord("stu-1", [term("c-x", "HK1", null)]);

    expect(record.years).toHaveLength(1);
    expect(record.years[0].yearId).toBe(UNRESOLVED_YEAR_ID);
    expect(record.years[0].isCurrent).toBe(false);
  });

  it("keeps two records of the same class in DIFFERENT years apart when the wire says so", () => {
    // The old classId → year join could not express this; the wire field can.
    const record = buildAcademicRecord("stu-1", [
      term("c-same", "HK1", "2024-2025"),
      term("c-same", "HK1", "2025-2026"),
    ]);

    expect(record.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      "2025-2026",
    ]);
  });

  it("derives each year's seal status from its terms", () => {
    const record = buildAcademicRecord("stu-1", [
      term("c-8", "HK1", "2023-2024", "SEALED"),
      term("c-8", "HK2", "2023-2024", "PENDING"),
      term("c-9", "HK1", "2024-2025", "UNSEALED"),
      term("c-10", "HK1", "2025-2026", "SEALED"),
    ]);

    expect(record.years.map((y) => y.sealStatus)).toEqual([
      "partial",
      "unsealed_in_year",
      "all_sealed",
    ]);
  });

  it("is sealed only when every term of every year is SEALED", () => {
    const all = buildAcademicRecord("stu-1", [
      term("c-9", "HK1", "2024-2025"),
      term("c-9", "HK2", "2024-2025"),
    ]);
    expect(all.sealed).toBe(true);

    const some = buildAcademicRecord("stu-1", [
      term("c-9", "HK1", "2024-2025"),
      term("c-9", "HK2", "2024-2025", "PENDING"),
    ]);
    expect(some.sealed).toBe(false);
  });

  it("an empty record list yields no years and is NOT sealed", () => {
    const record = buildAcademicRecord("stu-1", []);
    expect(record.years).toEqual([]);
    expect(record.sealed).toBe(false);
  });
});
