import { describe, expect, it } from "vitest";
import type {
  AcademicRecordRowDto,
  GradeSnapshotItemDto,
} from "../dtos/academic-record-response.dto";
import { mapAcademicRecordRow } from "./academic-record.mapper";

function item(
  subjectId: string,
  columnName: string,
  coefficient: string,
  value: string,
  columnId = `${subjectId}-${columnName}`,
): GradeSnapshotItemDto {
  return {
    subjectId,
    columnId,
    columnName,
    columnType: "REGULAR",
    coefficient,
    value,
  };
}

function row(over: Partial<AcademicRecordRowDto> = {}): AcademicRecordRowDto {
  return {
    classId: "c-10a1",
    termId: "HK1",
    studentMemberId: "stu-1",
    status: "SEALED",
    gradeSnapshot: [],
    termAverage: "",
    resealCount: 0,
    ...over,
  };
}

describe("mapAcademicRecordRow — wire row → TermRecord (US-E18.54)", () => {
  it("groups the flat gradeSnapshot array by subjectId, preserving first-seen order", () => {
    const term = mapAcademicRecordRow(
      row({
        gradeSnapshot: [
          item("s-math", "TX1", "1.0", "8.0"),
          item("s-lit", "TX1", "1.0", "7.0"),
          item("s-math", "Cuối kỳ", "3.0", "9.0"),
        ],
      }),
      new Map(),
    );

    expect(term.subjects.map((s) => s.subjectId)).toEqual(["s-math", "s-lit"]);
    expect(term.subjects[0].columns.map((c) => c.columnName)).toEqual([
      "TX1",
      "Cuối kỳ",
    ]);
  });

  it("parses the decimal-STRING coefficient and value into numbers", () => {
    const term = mapAcademicRecordRow(
      row({ gradeSnapshot: [item("s-math", "TX1", "2.0", "8.50")] }),
      new Map(),
    );

    const column = term.subjects[0].columns[0];
    expect(column.coefficient).toBe(2);
    expect(column.value).toBe(8.5);
  });

  it("maps an unparseable/empty value to null, never 0", () => {
    const term = mapAcademicRecordRow(
      row({
        gradeSnapshot: [
          item("s-math", "TX1", "", ""),
          item("s-math", "TX2", "n/a", "n/a"),
        ],
      }),
      new Map(),
    );

    expect(term.subjects[0].columns[0]).toMatchObject({
      coefficient: null,
      value: null,
    });
    expect(term.subjects[0].columns[1]).toMatchObject({
      coefficient: null,
      value: null,
    });
    expect(term.subjects[0].termAvg).toBeNull();
  });

  it("computes each subject's coefficient-weighted average and rank band", () => {
    const term = mapAcademicRecordRow(
      row({
        gradeSnapshot: [
          item("s-math", "TX1", "1.0", "8.0"),
          item("s-math", "Cuối kỳ", "3.0", "9.0"),
        ],
      }),
      new Map(),
    );

    // (8×1 + 9×3) / 4 = 8.75
    expect(term.subjects[0].termAvg).toBe(8.75);
    expect(term.subjects[0].rankBand).toBe("gioi");
  });

  it("resolves subject names from the injected catalogue, and leaves null (never the uuid) when unknown", () => {
    const term = mapAcademicRecordRow(
      row({
        gradeSnapshot: [
          item("s-math", "TX1", "1.0", "8.0"),
          item("s-ghost", "TX1", "1.0", "8.0"),
        ],
      }),
      new Map([["s-math", "Toán"]]),
    );

    expect(term.subjects[0].subjectName).toBe("Toán");
    expect(term.subjects[1].subjectName).toBeNull();
  });

  it("prefers the server-computed termAverage over the derived mean", () => {
    const term = mapAcademicRecordRow(
      row({
        termAverage: "7.25",
        gradeSnapshot: [item("s-math", "TX1", "1.0", "10.0")],
      }),
      new Map(),
    );

    expect(term.gpa).toBe(7.25);
  });

  it("derives the GPA from the subject averages when termAverage is empty", () => {
    const term = mapAcademicRecordRow(
      row({
        termAverage: "",
        gradeSnapshot: [
          item("s-math", "TX1", "1.0", "8.0"),
          item("s-lit", "TX1", "1.0", "6.0"),
        ],
      }),
      new Map(),
    );

    expect(term.gpa).toBe(7);
  });

  it("carries the seal/unseal metadata, mapping ABSENT optional keys to null", () => {
    const sealed = mapAcademicRecordRow(
      row({
        sealedAt: "2026-01-18T00:00:00Z",
        sealedBy: "adm-1",
        resealCount: 2,
      }),
      new Map(),
    );
    expect(sealed).toMatchObject({
      sealedAt: "2026-01-18T00:00:00Z",
      sealedBy: "adm-1",
      unsealedAt: null,
      unsealedBy: null,
      unsealReason: null,
      resealCount: 2,
    });

    const unsealed = mapAcademicRecordRow(
      row({
        status: "UNSEALED",
        unsealedAt: "2026-02-01T00:00:00Z",
        unsealedBy: "adm-2",
        unsealReason: "Phúc khảo môn Hoá",
      }),
      new Map(),
    );
    expect(unsealed).toMatchObject({
      status: "UNSEALED",
      unsealedAt: "2026-02-01T00:00:00Z",
      unsealedBy: "adm-2",
      unsealReason: "Phúc khảo môn Hoá",
      sealedAt: null,
    });
  });

  it("tolerates a PENDING record whose gradeSnapshot the server withholds entirely", () => {
    const term = mapAcademicRecordRow(
      // `gradeSnapshot` is a required key on the Go struct, but a nil slice
      // would marshal to `null` — never crash on it.
      row({
        status: "PENDING",
        gradeSnapshot: null as unknown as [],
      }),
      new Map(),
    );

    expect(term.subjects).toEqual([]);
    expect(term.gpa).toBeNull();
  });

  it("keeps classId + the free-form termId verbatim", () => {
    const term = mapAcademicRecordRow(
      row({ classId: "c-9a1", termId: "HK2" }),
      new Map(),
    );
    expect(term.classId).toBe("c-9a1");
    expect(term.termId).toBe("HK2");
  });
});
